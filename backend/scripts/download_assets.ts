import fs from 'fs';
import path from 'path';
import axios from 'axios';

const ASSETS = [
    { name: 'login-bg.jpg', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=2564&auto=format&fit=crop' },
    { name: 'team-bg.jpg', url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
    { name: 'quest-bg.jpg', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80' }, // Forest - Replacement for ambiguous Google URL
    { name: 'quest-thumb.jpg', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'proverb-bg-1.jpg', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1748&q=80' },
    { name: 'proverb-bg-2.jpg', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80' },
    { name: 'proverb-bg-3.jpg', url: 'https://images.unsplash.com/photo-1501854140884-074bf86ee980?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80' },
    { name: 'proverb-bg-4.jpg', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80' },
    { name: 'proverb-tao.jpg', url: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80' }
];

const TARGET_DIR = path.resolve(process.cwd(), '../public/images');

if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function downloadImage(name: string, url: string) {
    const filePath = path.join(TARGET_DIR, name);
    if (fs.existsSync(filePath)) {
        console.log(`Skipping ${name}, already exists.`);
        return;
    }

    try {
        console.log(`Downloading ${name} from ${url}...`);
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`Downloaded ${name}`);
                resolve(null);
            });
            writer.on('error', reject);
        });
    } catch (error: any) {
        console.error(`Error downloading ${name}:`, error.message);
    }
}

async function main() {
    console.log('Starting asset download...');
    console.log(`Target directory: ${TARGET_DIR}`);

    for (const asset of ASSETS) {
        await downloadImage(asset.name, asset.url);
    }
    console.log('Download complete!');
}

main();
