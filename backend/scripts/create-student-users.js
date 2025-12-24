const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');

// MongoDB connection - use the correct URI from config
const mongoUri = 'mongodb+srv://mrbairavan:kiruthik-13@cluster0.fhhvceb.mongodb.net/student-attendance-tracker?retryWrites=true&w=majority';

async function createUserAccountsForStudents() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // Get all students
        const students = await Student.find({});
        console.log(`📊 Found ${students.length} students in database\n`);

        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const student of students) {
            try {
                // Check if User account already exists
                const existingUser = await User.findOne({ email: student.email.toLowerCase() });

                if (existingUser) {
                    console.log(`⏭️  Skipped: ${student.fullName} (${student.email}) - User account already exists`);
                    skipped++;
                } else {
                    // Create User account with default password
                    const user = new User({
                        fullName: student.fullName,
                        email: student.email.toLowerCase(),
                        password: 'student123', // Default password
                        role: 'student',
                        isActive: true
                    });

                    await user.save();
                    console.log(`✅ Created: ${student.fullName} (${student.email}) - Password: student123`);
                    created++;
                }
            } catch (error) {
                console.error(`❌ Error creating user for ${student.fullName}: ${error.message}`);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📈 Summary:');
        console.log(`   ✅ Created: ${created} user accounts`);
        console.log(`   ⏭️  Skipped: ${skipped} (already exist)`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log('='.repeat(60));
        console.log('\n🎉 Migration completed!');
        console.log('🔑 All students can now login with password: student123\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

createUserAccountsForStudents();
