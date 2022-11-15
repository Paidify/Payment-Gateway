import app from './app.js';
import apiGateway from './api-gateway/apiGateway.js';
import { PORT } from './config/index.config.js';
import serveQueue from './gateway/serveQueue.js';

app.listen(PORT, async () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log(await apiGateway());
    
    // Serve pending payments requests. If they were already sent, they will be ignored by the Bank API and will be deleted from the queue
    await serveQueue();
});
