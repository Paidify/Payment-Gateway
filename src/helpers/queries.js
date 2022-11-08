import { PAYER_TYPE_PERSON, PAYER_TYPE_UNIV_ACTOR, PAYER_TYPE_USER } from "../config/constants.js";
import { readOne as readElement } from "./crud.js";

export async function getPersonId(payer_id, payer_type) {
    switch (payer_type) {
        case PAYER_TYPE_PERSON:
            return await readElement('person', { 'person': ['id'] }, [], { 'id': payer_id });
        case PAYER_TYPE_UNIV_ACTOR:
            return await readElement(
                'university_actor', { 'university_actor': ['id'] }, [], { 'id': payer_id }
            );
        case PAYER_TYPE_USER:
            return await readElement('user', { 'user': ['id'] }, [], { 'id': payer_id });
    }
}
