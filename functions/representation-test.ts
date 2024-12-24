import { presentationResponseSchema } from './lib/presentations';
import fs from 'fs';

fs.writeFileSync('presentationResponseSchema.json', JSON.stringify(presentationResponseSchema, null, 2));