import { Router } from 'express';
import { genReferenceNumber } from '../helpers/utils.js';
import { createOne, deleteOne, readMany, readOne, updateOne } from '../helpers/crud.js'
import dbPaidify from '../services/dbPaidify.js';
import dbUniv from '../services/dbUniv.js';

const router = new Router();

router.post('/', async (req, res) => {
    const { payer_id, payment_concept_id, amount, date, num_installments, campus_id, payment_concept_person_id, 
        card_id, cvv, exp_year, exp_month } = req.body;
    
    if(!payer_id || !payment_concept_id || !amount || !date || !num_installments || !campus_id || 
        !payment_concept_person_id || !card_id || !cvv || !exp_year || !exp_month) {
        
        return res.status(400).json({ message: 'Missing parameters' });
    }
});

export default router;
