import poolP from '../services/dbPaidify.js';
import poolU from '../services/dbUniv.js';
import { createOne, deleteOne, readMany, readOne, updateOne } from '../helpers/crud.js'
import fetch from "../helpers/fetch.js";
import { date2Mysql, genInvoiceNumber, getBankInfo, getCardCategory, parseOwnerName } from "../helpers/utils.js";
import { transporter } from '../services/mailer.js';
import { MAIL_USER } from '../config/index.config.js';

export default async function () {
    let payReqs, payConcepts, persons;

    try {
        payReqs = await readMany(
            'payment_req',
            {
                'payment_req': ['card_number', 'owner', 'cvv', 'exp_year', 'exp_month'],
                'payment': ['ref_number', 'date', 'num_installments', 'payment_concept_id', 'card_type_id'],
                'user': ['person_id'],
                'guest': ['email', 'doc_number'],
            },
            [
                'JOIN payment ON payment_req.payment_id = payment.id',
                'JOIN payer ON payment.payer_id = payer.id',
                'LEFT JOIN user ON payer.id = user.payer_id',
                'LEFT JOIN guest ON payer.id = guest.payer_id',
            ],
            null,
            poolP,
        );
    } catch(err) {
        return { status: 500, message: 'Error reading payment requests', error: err.message };
    }
    console.log(payReqs);

    if(!payReqs.length) return console.log('No payment requests to process');

    try {
        payConcepts = await readMany(
            'payment_concept',
            { 'payment_concept': ['id', 'amount'] },
            null, null, poolU
        );
    } catch(err) {
        return { status: 500, message: 'Error reading payment concepts', error: err.message };
    }

    try {
        persons = await readMany(
            'person',
            { 'person': ['id', 'email', 'doc_number'] },
            null,
            { 'id': payReqs.map(payReq => payReq.person_id) },
            poolU
        );
    } catch(err) {
        return { status: 500, message: 'Error reading persons', error: err.message };
    }

    // console.log('payReqs', payReqs);
    // console.log('payConcepts', payConcepts);
    // console.log('persons', persons);

    payReqs = payReqs.map(payReq => {
        const payConcept = payConcepts.find(concept => concept.id === payReq.payment_concept_id);
        if(!payConcept) return { error: true };
        payReq.amount = payConcept.amount;

        if(payReq.person_id) {
            const person = persons.find(person => person.id === payReq.person_id);
            if(!person) return { error: true };
            payReq.email = person.email;
            payReq.doc_number = person.doc_number;
        }
        delete payReq.person_id;
        
        return payReq;
    });
    payReqs = payReqs.filter(payReq => !payReq.error);

    payReqs.forEach(servePaymentReq);

    return { status: 200, message: 'Processing payment requests' };
}

export async function servePaymentReq ({owner, email, doc_number, amount, 
    card_type_id, card_number, exp_month, exp_year, cvv, num_installments, ref_number}) {
    
    // throw new Error('The service falls after saving the request and before sending it to the bank')
    
    const { bank, url } = getBankInfo(card_number);
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            'nombre': parseOwnerName(owner),
            'email': email,
            'id': doc_number,
            'monto': amount,
            'mdPago': card_type_id,
            'nroTarjeta': card_number,
            'franquicia': getCardCategory(card_number),
            'expMonth': exp_month,
            'expYear': exp_year,
            'cv': cvv,
            'nroCuotas': num_installments,
            'nroReferencia': ref_number
        }),
    }).then(async ({ data: json }) => {
        // throw new Error('The service falls before receiving an answer from bank')
        console.log(ref_number, json);
        const { successful, effective_date, amount, balance, fulfilled } = json.data;
        const eff_date = new Date(effective_date);
        
        let payment, paySettledId, invNumber;
        const mailOrg = {
            from: `"Paidify" <${MAIL_USER}>`,
            to: MAIL_USER,
            subject: `Payment Completed (${ref_number})`,
            html: `
                <h2>Payment with Reference Number ${ref_number} Completed</h2>
                <p><b>Successful:</b> ${successful}</p>
                <p><b>Effective </b>Date: ${eff_date}</p>
                <p><b>Amount:</b> ${amount}</p>
                <p><b>Balance:</b> ${balance}</p>
                <p><b>Fulfilled:</b> ${fulfilled}</p>
            `
        };
        const mailClient = {
            from: `"Paidify" <${MAIL_USER}>`,
            to: 'uwu.ossas.uwu@gmail.com',
        };
        const errors = [];
        try {
            payment = await readOne(
                'payment',
                { 'payment': ['id', 'payment_concept_person_id', 'date', 'gateway_date',
                    'num_installments', 'campus_id', 'payment_concept_id'] },
                [],
                { ref_number },
                poolP
            );
        } catch(err) {
            if(err.message === 'Not found') console.log(`Payment with ref_number ${ref_number} not found`);
            else console.log(`Payment with ref_number ${ref_number} found (${payment.id}), but error: ${err.message}`);
            errors.push('<p><b>Payment:</b> Not found</p>');
        }

        // create payment_settled without payment_id, even if payment is not found
        try {
            paySettledId = (await createOne(
                'payment_settled',
                {
                    amount, balance,
                    fulfilled: fulfilled ? 1 : 0,
                    successful: successful ? 1 : 0,
                    payment_id: payment.id || null,
                    effective_date: date2Mysql(eff_date)
                },
                poolP
            )).insertId;
            console.log(`Payment settled with ref_number ${ref_number} created`);
        } catch(err) {
            console.log(`Cannot create payment_settled with ref_number ${ref_number}`);
            console.log(err);
            errors.push('<p><b>Payment settled:</b> Not created</p>');
        }

        // delete payment_req
        if(payment) {
            try {
                await deleteOne('payment_req', { payment_id: payment.id }, poolP);
            } catch(err) {
                console.log(`Cannot delete payment_req with ref_number ${ref_number}`);
                errors.push('<p><b>Payment request:</b> Not deleted</p>');
            }
        }
        
        // update payment_concept_person in University DB
        if(successful) {
            if(payment) {
                if(payment.payment_concept_person_id) {
                    try {
                        await updateOne(
                            'payment_concept_person',
                            { completed: 1 },
                            { id: payment.payment_concept_person_id },
                            poolU
                        );
                    } catch(err) {
                        console.log(`Cannot update payment_concept_person with id ${payment.payment_concept_person_id}`);
                        errors.push('<p><b>Payment concept person:</b> Not updated</p>');
                    }
                }
                try {
                    payment.campus = (await readOne(
                        'campus',
                        { 'campus': ['campus'] },
                        [],
                        { id: payment.campus_id },
                        poolU
                    )).campus;
                } catch(err) {}

                try {
                    payment.payment_concept = await readOne(
                        'payment_concept',
                        { 'payment_concept': ['payment_concept', 'amount'] },
                        [],
                        { id: payment.payment_concept_id },
                        poolU
                    );
                } catch(err) {}
            }

            // generate invoice
            if(paySettledId) {
                invNumber = genInvoiceNumber();
                try {
                    await createOne(
                        'invoice',
                        { payment_settled_id: paySettledId, invoice_number: invNumber },
                        poolP
                    );
                } catch(err) {
                    console.log(`Cannot create invoice with payment_id ${payment.id}`);
                    errors.push('<p><b>Invoice:</b> Not created</p>');
                }
            }

            mailClient.subject = (payment && payment.payment_concept) ?
                `Pago de ${payment.payment_concept.payment_concept} realizado` : 'Pago con número de referencia ${ref_number} realizado';
            
            mailClient.html = `
                <h2>Pago con Número de Referencia ${ref_number} Exitoso</h2>
                <h4>Pago aprobado por ${bank}</h4>
                <p><b>Número de factura:</b> ${invNumber ? invNumber : 'No generado'}</p>
                ${payment ?
                    `
                    <p><b>Número de cuotas:</b> ${payment.num_installments}</p>
                    <p><b>Fecha de pago:</b> ${payment.date.toLocaleString()}</p>
                    <p><b>Fecha de pasarela de pago:</b> ${payment.gateway_date.toLocaleString()}</p>
                    ${payment.campus ? `<p><b>Sede:</b> ${payment.campus}</p>` : ''}
                    ${payment.payment_concept ?
                        `
                        <p><b>Concepto de pago:</b> ${payment.payment_concept.payment_concept}</p>
                        <p><b>Monto:</b> ${payment.payment_concept.amount}</p>
                        ` : ''
                    }
                    `
                    :''
                }
                <p><b>Monto total:</b> ${amount}</p>
                <p><b>Fecha efectiva:</b> ${eff_date.toLocaleString()}</p>
            `;
        } else {
            mailClient.subject = `Pago fallido (${ref_number})`;
            mailClient.html = `
                <h2>Pago con Número de Referencia ${ref_number} Fallido</h2>
                <h4>Pago rechazado por ${bank}</h4>
                <p><b>Motivo</b>: ${json.reason}</p>
                <p><b>Fecha efectiva:</b> ${eff_date.toLocaleString()}</p>
            `;
        }

        // send mail to client
        try {
            await transporter.sendMail(mailClient);
            console.log(`Mail sent to ${mailClient.to} (Payment completed)`);
        } catch(err) {
            console.log(`Cannot send mail to ${mailClient.to}`);
            errors.push('<p><b>Mail to client:</b> Not sent</p>');
        }

        // send mail to org
        if(errors.length) {
            mailOrg.html += `
                <br><hr>
                <h4>Internal Errors During Payment</h4>
                ${errors.join('')}
            `;
        }
        try {
            await transporter.sendMail(mailOrg);
            console.log(`Mail sent to ${mailOrg.to}`);
        } catch(err) {
            console.log(`Cannot send mail to ${mailOrg.to}`);
        }
    }).catch(err => {
        console.log('Payment request failed', err.message);
    });
}
