const mongoose = require('mongoose');

// Define Schema minimal required parts
const TaskSchema = new mongoose.Schema({
    title: String,
    status: String,
    targetCities: [String],
    isDeleted: Boolean,
    coverImageUrl: String
});

const Task = mongoose.model('Task', TaskSchema);

mongoose.connect('mongodb://localhost:27017/city_explorer')
    .then(async () => {
        console.log("Connected to DB");
        const tasks = await Task.find({ title: /在海边散步/ });
        console.log("Tasks found:", tasks.length);

        tasks.forEach(t => {
            console.log(`Title: ${t.title}`);
            console.log(`Image: ${t.coverImageUrl}`);
        });

        await mongoose.disconnect();
    })
    .catch(err => console.error(err));
