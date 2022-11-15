import bcrypt from 'bcryptjs';

export default function hashValue(value) {
    return bcrypt.hashSync(value, 10);
}
