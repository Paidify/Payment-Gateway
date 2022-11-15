import poolP from '../services/dbPaidify.js';
import poolU from '../services/dbUniv.js';
import { createOne, deleteOne, readMany, readOne, updateOne } from '../helpers/crud.js'
import fetch from "../helpers/fetch.js";
import { genInvoiceNumber, getBankApiEndpoint } from "../helpers/utils.js";

export default async function () {
    let payReqs, payConcepts, persons;

    try {
        payReqs = await readMany(
            'payment_req',
            {
                'payment_req': ['card_number', 'owner', 'cvv', 'exp_year', 'exp_month'],
                'payment': ['ref_number', 'date', 'num_installments', 'payment_concept_id'],
                'user': ['person_id'],
                'guest': ['first_name', 'last_name', 'email', 'doc_number'],
                'card_type': ['card_type'],
            },
            [
                'JOIN payment ON payment_req.payment_id = payment.id',
                'JOIN payer ON payment.payer_id = payer.id',
                'LEFT JOIN user ON payer.id = user.payer_id',
                'LEFT JOIN guest ON payer.id = guest.payer_id',
                'JOIN card_type ON payment.card_type_id = card_type.id',
            ],
            null,
            poolP,
        );
    } catch(err) {
        return { error: 'Cannot read payment requests' };
    }

    if(!payReqs.length) return console.log('No payment requests to process');

    try {
        payConcepts = await readMany(
            'payment_concept',
            { 'payment_concept': ['id', 'amount'] },
            null, null, poolU
        );
    } catch(err) {
        return { error: 'Cannot read payment concepts' };
    }

    try {
        persons = await readMany(
            'person',
            { 'person': ['id', 'first_name', 'last_name', 'email', 'doc_number'] },
            null, null, poolU
        );
    } catch(err) {
        return { error: 'Cannot read persons' };
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
            payReq.first_name = person.first_name;
            payReq.last_name = person.last_name;
            payReq.email = person.email;
            payReq.doc_number = person.doc_number;
        }
        delete payReq.person_id;
        
        return payReq;
    });
    console.log(payReqs);
    payReqs = payReqs.filter(payReq => !payReq.error);

    payReqs.forEach(servePaymentReq);

    // let i = 0;
    // const interval = setInterval(() => {
    //     servePaymentReq(payReqs[i]);
    //     i++;
    //     if(i === payReqs.length) clearInterval(interval);
    // }, 5000);

    return { message: 'Processing payment requests' };
}

export async function servePaymentReq ({first_name, last_name, email, doc_number, amount, 
    card_type_id, card_number, exp_month, exp_year, cvv, num_installments, ref_number}) {
    
    // console.log({
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //         'nombre': first_name + ' ' + last_name,
    //         'email': email,
    //         'id': doc_number,
    //         'monto': amount,
    //         'mdPago': card_type_id,
    //         'nroTarjeta': card_number,
    //         'expMonth': exp_month,
    //         'expYear': exp_year,
    //         'cvv': cvv,
    //         'nroCuotas': num_installments,
    //     }),
    // });
    return fetch(getBankApiEndpoint(card_number), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            'nombre': first_name + ' ' + last_name,
            'email': email,
            'id': doc_number,
            'monto': amount,
            'mdPago': card_type_id,
            'nroTarjeta': card_number,
            'expMonth': exp_month,
            'expYear': exp_year,
            'cvv': cvv,
            'nroCuotas': num_installments,
            'nroReferencia': ref_number,
        }),
    }).then(async res => {
        console.log(res);
        if(res.message === 'OK') {
            const { successful, ref_number, effective_date, amount, balance, fulfilled } = res.data;
            
            let paymentId, payConceptPersonId;
            try {
                const payment = await readOne(
                    'payment', { 'payment': ['id', 'payment_concept_person_id'] }, [], { ref_number }, poolP
                );
                paymentId = payment.id;
                payConceptPersonId = payment.payment_concept_person_id;
            } catch(err) {
                if(err.message === 'Not found') console.log(`Payment with ref_number ${ref_number} not found`);
                else console.log(`Payment with ref_number ${ref_number} found (${paymentId}), but error: ${err.message}`);
                
                // create payment_settled without payment_id
                try {
                    await createOne(
                        'payment_settled',
                        {
                            ref_number, effective_date, amount, balance,
                            fulfilled: fulfilled ? 1 : 0,
                            successful: successful ? 1 : 0,
                            // payment_id: null,
                        },
                        poolP
                    );
                } catch(err) {
                    console.log(`Cannot create payment_settled with ref_number ${ref_number}`);
                    // TODO: send mail to Paidify organization reporting payment_req not deleted because payment not found and payment_settled not created
                    return;
                }
                console.log(`Payment settled with ref_number ${ref_number} created`);
                // TODO: send mail to Paidify organization reporting payment_req not deleted because payment not found
            }

            // delete payment_req
            try {
                await deleteOne('payment_req', { payment_id: paymentId }, poolP);
            } catch(err) {
                console.log(`Cannot delete payment_req with ref_number ${ref_number}`);
                // TODO: send mail to Paidify organization reporting payment_req not deleted
            }

            // create payment_settled
            try {
                await createOne(
                    'payment_settled',
                    {
                        ref_number, effective_date, amount, balance,
                        fulfilled: fulfilled ? 1 : 0,
                        successful: successful ? 1 : 0,
                        payment_id: paymentId,
                    },
                    poolP
                );
            } catch(err) {
                console.log(`Cannot create payment_settled with ref_number ${ref_number}`);
                // TODO: send mail to Paidify organization reporting payment_settled not created
            }
            
            // update payment_concept_person in University DB
            if(successful) {
                if(payConceptPersonId) {
                    try {
                        await updateOne(
                            'payment_concept_person',
                            { completed: 1 },
                            { id: payConceptPersonId },
                            poolU
                        );
                    } catch(err) {
                        console.log(`Cannot update payment_concept_person with id ${payConceptPersonId}`);
                        // TODO: send mail to Paidify organization reporting payment_concept_person not updated
                    }
                }

                // generate invoice
                try {
                    await createOne(
                        'invoice',
                        { payment_id: paymentId, invoice_number: genInvoiceNumber() },
                        poolP
                    );
                } catch(err) {
                    console.log(`Cannot create invoice with payment_id ${paymentId}`);
                    // TODO: send mail to Paidify organization reporting invoice not created
                }
            }
            
            return { message: 'Payment processed' };
        } else {
            return { error: 'Payment not processed' };
            // TODO: send mail to client reporting payment not processed
        }
    }).catch(err => {
        console.log('Payment request failed', err.message);
    });

    // TODO: send mail to client notifying payment request processed
}
