import { Router } from 'express';
import { PAYER_TYPE_PERSON, PAYER_TYPE_UNIV_ACTOR, PAYER_TYPE_USER } from '../config/constants.js';
import { getPersonId } from '../helpers/queries.js';
import { genReferenceNumber } from '../helpers/utils.js';
import bankApi from '../services/bankApi.js';
import {
    createOne as createElement,
    deleteOne as deleteElement,
    updateOne as updateElement,
    readOne as readElement,
    readMany as readElements,
} from '../helpers/crud.js'

const router = new Router();

router.post('/', async (req, res) => {
    const { amount, date, num_installments, payment_concept_id, payer_id, payer_type, campus_id, 
        card_id, cvv, exp_year, exp_month } = req.body;
    
    if(!amount || !date || !num_installments || !payment_concept_id || !payer_id || !payer_type 
        || !campus_id || !card_id || !cvv || !exp_year || !exp_month) {
        
        return res.status(400).json({ message: 'Missing parameters' });
    }
    let personId;
    try {
        personId = await getPersonId(payer_id, payer_type);
    } catch(err) {
        if(err.message === 'Not Found') return res.status(404).json({ message: 'Payer not found' });
        return res.status(500).json({ message: 'Internal server error' });
    }
    try {
        personId = getPersonId(payer_id, payer_type);
    } catch(err) {
        if(err.message === 'Not Found') return res.status(404).json({ message: 'Payer not found' });
        return res.status(500).json({ message: 'Internal server error' });
    }
    try {
        personId = getPersonId(payer_id, payer_type);
    } catch(err) {
        if(err.message === 'Not Found') return res.status(404).json({ message: 'Payer not found' });
        return res.status(500).json({ message: 'Internal server error' });
    }
    // fields.gateway_date = new Date();
    // fields.reference_number = genReferenceNumber();
    
});

export default router;
