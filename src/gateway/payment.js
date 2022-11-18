import { Router } from 'express';
import poolP from '../services/dbPaidify.js';
import poolU from '../services/dbUniv.js';
import { createOne, readOne, updateOne } from '../helpers/crud.js'
import hashValue from '../helpers/hashValue.js';
import {
    date2Mysql,
    genReferenceNumber,
    getBankInfo,
    validateCardNumber,
    validateCvv,
    validateDate,
    validateExpMonth,
    validateExpYear,
    validateNumInstallments
} from '../helpers/utils.js';
import { servePaymentReq } from './serveQueue.js';
import { transporter } from '../services/mailer.js';
import { MAIL_USER } from '../config/index.config.js';
import { CARD_TYPE_DEBIT } from '../config/constants.js';

const router = new Router();

router.post('/', async (req, res) => {
    const { user_id, date, num_installments, campus_id, payment_concept_id, 
        payment_concept_person_id, cvv, exp_year, exp_month } = req.body;
    
    // check fields
    if(!campus_id || !payment_concept_id || !validateNumInstallments(num_installments)
        || !validateCvv(cvv) || !validateExpYear(exp_year) || !validateExpMonth(exp_month) || !validateDate(date)) {
        console.log('Invalid fields');
        return res.status(400).json({ message: 'Bad request' });
    }
    
    // validate campus_id
    try {
        await readOne('campus', { 'campus': ['id'] }, [], { id: campus_id }, poolU);
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(400).json({ message: 'Invalid campus' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    // validate payment_concept_id
    let amount;
    try {
        amount = (await readOne(
            'payment_concept', { 'payment_concept': ['amount'] }, [], { id: payment_concept_id }, poolU
        )).amount;
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(400).json({ message: 'Invalid payment concept' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    // validate payment_concept_person_id if given
    if(payment_concept_person_id) {
        try {
            await readOne(
                'payment_concept_person',
                { 'payment_concept_person': ['id'] },
                [],
                { id: payment_concept_person_id },
                poolU
            );
        } catch(err) {
            if(err.message === 'Not found') {
                return res.status(400).json({ message: 'Invalid payment concept person' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    
    let refNumber, payerFields, cardFields;
    const _ = {
        cvv: hashValue(String(cvv)),
        exp_year: hashValue(String(exp_year)),
        exp_month: hashValue(String(exp_month)),
    }
    
    const connP = await poolP.getConnection();
    try {
        await connP.beginTransaction();

        if(!user_id) {
            const { first_name, last_name, email, doc_number, doc_type, city, department, 
                zip_code, address_line, card_number, card_type, owner } = req.body;
            
            if(!first_name || !last_name || !email || !doc_number || !doc_type || !owner 
                || !validateCardNumber(card_number) || !card_type) {
                // console.log('Bad request');
                return res.status(400).json({ message: 'Bad request' });
            }
            
            // get card_type_id
            try {
                const cardTypeId = (await readOne(
                    'card_type', { 'card_type': ['id'] }, [], { card_type: card_type }, poolP
                )).id;
                cardFields = { card_number, card_type_id: cardTypeId, owner };
            } catch(err) {
                if(err.message === 'Not found') {
                    return res.status(400).json({ message: 'Invalid card type' });
                }
                return res.status(500).json({ message: 'Internal server error' });
            }
            if(cardFields.card_type_id === CARD_TYPE_DEBIT && num_installments > 1) {
                return res.status(400).json({ message: 'Debit cards do not support installments' });
            }
    
            let guest, cityId, addressId, docTypeId;
            
            // get doc_type_id
            try {
                docTypeId = (await readOne('doc_type', { 'doc_type': [ 'id' ] }, [], { doc_type }, poolU)).id;
            } catch(err) {
                if(err.message === 'Not found') {
                    return res.status(400).json({ message: 'Invalid document type' });
                }
                return res.status(500).json({ message: 'Internal server error' });
            }
            const guestFields = { first_name, last_name, email, doc_number, doc_type_id: docTypeId };
            
            // get city_id
            if(city && department) {
                try {
                    cityId = (await readOne(
                        'city',
                        { 'city': ['id'] },
                        ['JOIN department ON city.department_id = department.id'],
                        { city, department },
                        poolU
                    )).id;
                } catch {}
            }
            const addressFields = {
                zip_code: zip_code || null,
                address_line: address_line || null,
                city_id: cityId || null
            };
    
            try {
                guest = await readOne(
                    'guest', { 'guest': ['id', 'address_id', 'payer_id'] }, [], { doc_number }, poolP
                );
            } catch(err) {}
    
            try {
                let payerId;
                if(guest) { // update guest
                    payerId = guest.payer_id;
                    await updateOne('guest', guestFields, { id: guest.id }, connP);
                    await updateOne('address', addressFields, { id: guest.address_id }, connP);
                } else { // create guest
                    addressId = (await createOne('address', addressFields, connP)).insertId;
                    guestFields.address_id = addressId;
                    payerId = (await createOne('payer', {}, connP)).insertId;
                    guestFields.payer_id = payerId;
                    await createOne('guest', guestFields, connP);
                }
                payerFields = { first_name, last_name, email, doc_number, payer_id: payerId };
            } catch (err) {
                console.log(err);
                await connP.rollback();
                connP.release();
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Duplicate entry when creating guest' });
                }
                return res.status(500).json({ message: 'Internal server error' });
            }
        } else {
            if(!req.body.payment_method_id) {
                return res.status(400).json({ message: 'Missing required fields' });
            }
            try {
                const payMeth = await readOne(
                    'payment_method',
                    { 'payment_method': ['card_number', 'owner', 'card_type_id'] },
                    [],
                    { id: req.body.payment_method_id },
                    poolP
                );
                cardFields = {
                    card_number: payMeth.card_number,
                    card_type_id: payMeth.card_type_id,
                    owner: payMeth.owner
                }
            } catch(err) {
                if(err.message === 'Not found') {
                    return res.status(400).json({ message: 'Invalid payment method' });
                }
                return res.status(500).json({ message: 'Internal server error' });
            }
            if(cardFields.card_type_id === CARD_TYPE_DEBIT && num_installments > 1) {
                return res.status(400).json({ message: 'Debit cards do not support installments' });
            }
            
            try {
                payerFields = await readOne(
                    'user',
                    { 'user': ['payer_id', 'first_name', 'last_name', 'email', 'doc_number'] },
                    [],
                    { id: user_id },
                    poolP
                );
            } catch(err) {
                if(err.message === 'Not found') {
                    return res.status(400).json({ message: 'Invalid user' });
                }
                return res.status(500).json({ message: 'Internal server error' });
            }
        }
        // create payment
        refNumber = genReferenceNumber();
        try {
            const paymentId = (await createOne(
                'payment',
                {
                    gateway_date: date2Mysql(new Date()),
                    date: date2Mysql(new Date(date)),
                    ref_number: refNumber,
                    card_type_id: cardFields.card_type_id,
                    payer_id: payerFields.payer_id,
                    payment_concept_person_id: payment_concept_person_id || null,
                    num_installments, campus_id, payment_concept_id,
                },
                connP
            )).insertId;
            await createOne(
                'payment_req',
                {
                    card_number: cardFields.card_number,
                    owner: cardFields.owner,
                    payment_id: paymentId,
                    ..._
                },
                connP
            );
        } catch(err) {
            console.log(err);
            await connP.rollback();
            connP.release();
            return res.status(500).json({ message: 'Error when creating payment' });
        }
        await connP.commit();
    } catch (err) {
        console.log(err);
        await connP.rollback();
        connP.release();
        return res.status(500).json({ message: 'Internal server error' });
    }
    connP.release();

    res.status(201).json({ message: 'Payment created', ref_number: refNumber });
    servePaymentReq({
        first_name: payerFields.first_name,
        last_name: payerFields.last_name,
        email: payerFields.email,
        doc_number: payerFields.doc_number,
        amount,
        card_type_id: cardFields.card_type_id,
        card_number: cardFields.card_number,
        exp_month: _.exp_month,
        exp_year: _.exp_year,
        cvv: _.cvv,
        num_installments,
        ref_number: refNumber
    }).then(() => {
        console.log('Payment request served');
    }).catch(() => {
        // console.log('Payment request couldn\'t be served');
    });

    const { bank } = getBankInfo(cardFields.card_number);
    const mailClient = {
        from: `"Paidify" <${MAIL_USER}>`,
        to: 'uwu.ossas.uwu@gmail.com',
        subject: 'Pago en Proceso',
        html: `
            <h2>Solicitud de Pago Recibida</h2>
            <p>Tu pago fue recibido por Paidify y está siendo procesado por ${bank}.</p>
            <p>Recibirás un correo de confirmación del pago en un plazo máximo de cinco (5) días hábiles.</p>
            <p><b>Número de referencia:</b> ${refNumber}</p>
        `
    };
    try {
        await transporter.sendMail(mailClient);
        console.log(`Mail sent to ${mailClient.to}`);
    } catch(err) {
        console.log(`Cannot send mail to ${mailClient.to}`);
    }
});

export default router;
