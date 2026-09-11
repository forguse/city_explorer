import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Task from '../models/Task';

// Helper function to parse trip text
const parseTripText = (text: string) => {
    // Common patterns for Chinese travel tickets
    const trainPattern = /([GDCKTZgdcktz]\d{1,4})\s*次?.*?(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/;
    const flightPattern = /([A-Z]{2}\d{3,4}).*?(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/i;
    const cityPattern = /([一-龥]{2,4})[站机场]?\s*[→➔\->至到]+\s*([一-龥]{2,4})[站机场]?/;
    const dateChinese = /(\d{1,2})月(\d{1,2})日|(\d{4})年(\d{1,2})月(\d{1,2})日/;

    let type: 'train' | 'flight' | 'other' = 'other';
    let code = '';
    let from = '';
    let to = '';
    let date = '';

    // Try to match train
    const trainMatch = text.match(trainPattern);
    if (trainMatch) {
        type = 'train';
        code = trainMatch[1].toUpperCase() + '次';
        date = trainMatch[2];
    }

    // Try to match flight
    const flightMatch = text.match(flightPattern);
    if (flightMatch && type === 'other') {
        type = 'flight';
        code = flightMatch[1].toUpperCase();
        date = flightMatch[2];
    }

    // Try to match cities
    const cityMatch = text.match(cityPattern);
    if (cityMatch) {
        from = cityMatch[1];
        to = cityMatch[2];
    }

    // Try to match Chinese date format
    if (!date) {
        const dateChMatch = text.match(dateChinese);
        if (dateChMatch) {
            if (dateChMatch[3]) {
                date = `${dateChMatch[3]}-${dateChMatch[4].padStart(2, '0')}-${dateChMatch[5].padStart(2, '0')}`;
            } else {
                const year = new Date().getFullYear();
                date = `${year}-${dateChMatch[1].padStart(2, '0')}-${dateChMatch[2].padStart(2, '0')}`;
            }
        }
    }

    // Calculate weekday
    let weekday = '';
    if (date) {
        const d = new Date(date);
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        weekday = weekdays[d.getDay()];
    }

    return {
        type,
        code,
        from: from || '未知出发地',
        to: to || '未知目的地',
        date: date || new Date().toISOString().split('T')[0],
        weekday: weekday || '',
        parsed: !!(code || (from && to)),
        rawText: text.substring(0, 200)
    };
};

// POST /utils/trip-parse - Parse clipboard text and return structured data
export const parseTrip = async (req: AuthRequest, res: Response) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'No text provided' });
        }

        const parsed = parseTripText(text);
        res.json(parsed);
    } catch (error) {
        res.status(400).json({ error: 'Failed to parse trip text', details: error });
    }
};

// POST /utils/trip-import - Create a task from parsed trip data
export const importTrip = async (req: AuthRequest, res: Response) => {
    try {
        const { type, code, from, to, date } = req.body;

        // Create a task based on the trip info
        const task = new Task({
            title: `${type === 'train' ? '🚄' : type === 'flight' ? '✈️' : '🚗'} ${from} → ${to}`,
            description: `${code} | ${date}\n自动导入的行程任务`,
            location: { name: to },
            author: req.userId,
            nodes: [
                { description: `出发: ${from}`, isLocationSpecific: false },
                { description: `到达: ${to}`, isLocationSpecific: true }
            ],
            prepListConfig: [
                { title: '检查证件', type: 'documents', defaultNote: '身份证/护照' },
                { title: '确认行程', type: 'ticket', defaultNote: code }
            ],
            isAI: false,
            isOfficial: false
        });

        await task.save();
        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ error: 'Failed to import trip', details: error });
    }
};

export const remixTask = async (req: AuthRequest, res: Response) => {
    try {
        const { sourceTaskId } = req.body;
        const sourceTask = await Task.findById(sourceTaskId);
        if (!sourceTask) return res.status(404).json({ error: 'Source task not found' });

        const newTask = new Task({
            title: `Remix of ${sourceTask.title}`,
            description: sourceTask.description,
            location: sourceTask.location,
            coverImageUrl: sourceTask.coverImageUrl,
            difficulty: sourceTask.difficulty,
            author: req.userId,
            nodes: sourceTask.nodes,
            isAI: false,
            isOfficial: false,
            prepListConfig: sourceTask.prepListConfig
        });

        await newTask.save();
        res.status(201).json(newTask);
    } catch (error) {
        res.status(400).json({ error: 'Failed to remix task', details: error });
    }
};
