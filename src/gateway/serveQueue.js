import poolP from '../services/dbPaidify.js';
import poolU from '../services/dbUniv.js';
import { createOne, deleteOne, readMany, readOne, updateOne } from '../helpers/crud.js'
import fetch from "../helpers/fetch.js";
import { getBankApiEndpoint } from "../helpers/utils.js";

export default async function () {
    let payReqs, payConcepts, persons;

    try {
        payReqs = await readMany(
            'payment_req',
            {
                'payment_req': ['card_number', 'owner', 'cvv', 'exp_year', 'exp_month'],
                'payment': ['date', 'num_installments', 'payment_concept_id'],
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
        if(payReq.person_id) {
            const person = persons.find(person => person.id === payReq.person_id);
            payReq.first_name = person.first_name;
            payReq.last_name = person.last_name;
            payReq.email = person.email;
            payReq.doc_number = person.doc_number;
        }
        delete payReq.person_id;
        payReq.amount = payConcepts.find(concept => concept.id === payReq.payment_concept_id).amount;
        return payReq;
    });
    console.log(payReqs);

    payReqs.forEach(servePaymentReq);

    // let i = 0;
    // const interval = setInterval(() => {
    //     servePaymentReq(payReqs[i]);
    //     i++;
    //     if(i === payReqs.length) clearInterval(interval);
    // }, 5000);

    return { message: 'Payment requests processed' };
}

export async function servePaymentReq ({first_name, last_name, email, doc_number, amount, 
    card_type_id, card_number, exp_month, exp_year, cvv, num_installments}) {
    
    console.log({
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
        }),
    });
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
        }),
    }).then(message => {
        console.log(message);
    });
}
