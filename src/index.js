import app from './app.js';
import apiGateway from './api-gateway/apiGateway.js';
import { PORT } from './config/index.config.js';

app.listen(PORT, async () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log(await apiGateway());
});
