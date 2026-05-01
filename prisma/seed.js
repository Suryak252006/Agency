const { PrismaClient, UserRole, MarksStatus, RequestStatus, RequestType } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID || 'school_001';
const indianFirstNames = [
  'Aarav',
  'Vihaan',
  'Arjun',
  'Reyansh',
  'Ayaan',
  'Ishaan',
  'Krishna',
  'Aditya',
  'Rohan',
  'Karan',
  'Aditi',
  'Ananya',
  'Diya',
  'Priya',
  'Siya',
  'Ishita',
  'Meera',
  'Kavya',
  'Riya',
  'Nandini',
];

const indianLastNames = [
  'Sharma',
  'Verma',
  'Patel',
  'Singh',
  'Gupta',
  'Iyer',
  'Nair',
  'Reddy',
  'Joshi',
  'Khan',
  'Das',
  'Malhotra',
  'Chopra',
  'Bose',
  'Mehta',
  'Kapoor',
  'Agarwal',
  'Pillai',
  'Mishra',
  'Saxena',
];

const indianCities = [
  'Delhi',
  'Mumbai',
  'Bengaluru',
  'Chennai',
  'Hyderabad',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
];

const classSubjects = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Geography',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Economics',
  'Civics',
  'Accountancy',
  'Hindi',
  'Sanskrit',
  'Art',
  'Music',
  'Physical Education',
  'Business Studies',
  'Environmental Studies',
  'Social Science',
];

function pick(list, index) {
  return list[index % list.length];
}

function makeIndianName(index, offset = 0) {
  const firstName = pick(indianFirstNames, index + offset);
  const lastName = pick(indianLastNames, Math.floor(index / indianFirstNames.length) + offset);

  return `${firstName} ${lastName}`;
}

function makeEmailFromName(name, index, domain = 'school.in') {
  const localPart = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, '.')
    .replace(/\.+/g, '.');

  return `${localPart}.${String(index + 1).padStart(3, '0')}@${domain}`;
}

function makeStudentEmail(name, index) {
  return makeEmailFromName(name, index, 'students.school.in');
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.marksHistory.deleteMany();
  await prisma.marks.deleteMany();
  await prisma.request.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.classStudent.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.class.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  const adminName = 'Aarav Sharma';
  const adminUser = await prisma.user.create({
    data: {
      email: 'principal@school.in',
      name: adminName,
      role: UserRole.ADMIN,
      schoolId: SCHOOL_ID,
      password: passwordHash,
    },
  });

  const facultyUsers = [];

  const leadFacultyName = 'Priya Nair';
  const leadFacultyUser = await prisma.user.create({
    data: {
      email: 'faculty@school.in',
      name: leadFacultyName,
      role: UserRole.FACULTY,
      schoolId: SCHOOL_ID,
      password: passwordHash,
    },
  });

  const leadFaculty = await prisma.faculty.create({
    data: {
      userId: leadFacultyUser.id,
      schoolId: SCHOOL_ID,
    },
  });

  facultyUsers.push({ user: leadFacultyUser, faculty: leadFaculty });

  for (let index = 1; index < 10; index += 1) {
    const name = makeIndianName(index, 4);
    const user = await prisma.user.create({
      data: {
        email: makeEmailFromName(name, index, 'faculty.school.in'),
        name,
        role: UserRole.FACULTY,
        schoolId: SCHOOL_ID,
        password: passwordHash,
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        userId: user.id,
        schoolId: SCHOOL_ID,
      },
    });

    facultyUsers.push({ user, faculty });
  }

  const students = [];
  for (let index = 0; index < 100; index += 1) {
    const name = makeIndianName(index, 8);
    const student = await prisma.student.create({
      data: {
        email: makeStudentEmail(name, index),
        name,
        rollNo: `R${String(index + 1).padStart(3, '0')}`,
        schoolId: SCHOOL_ID,
      },
    });

    students.push(student);
  }

  const classes = [];
  for (let index = 0; index < 20; index += 1) {
    const assignedFaculty = facultyUsers[index % facultyUsers.length].faculty;
    const grade = 1 + Math.floor(index / 2);
    const classRecord = await prisma.class.create({
      data: {
        schoolId: SCHOOL_ID,
        name: `Grade ${grade} ${pick(['A', 'B', 'C', 'D'], index)} - ${pick(indianCities, index)}`,
        grade,
        section: String.fromCharCode(65 + (index % 4)),
        subject: classSubjects[index],
        facultyId: assignedFaculty.id,
      },
    });

    classes.push(classRecord);
  }

  const classEnrollments = [];
  for (let index = 0; index < students.length; index += 1) {
    const classRecord = classes[index % classes.length];
    classEnrollments.push({
      classId: classRecord.id,
      studentId: students[index].id,
    });
  }

  await prisma.classStudent.createMany({
    data: classEnrollments,
  });

  const exams = [];
  for (let index = 0; index < classes.length; index += 1) {
    const classRecord = classes[index];
    const classExams = [
      {
        schoolId: SCHOOL_ID,
        classId: classRecord.id,
        name: `${classRecord.subject} Midterm`,
        maxMarks: 100,
        startDate: new Date(Date.now() - (20 - index) * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - (19 - index) * 24 * 60 * 60 * 1000),
      },
      {
        schoolId: SCHOOL_ID,
        classId: classRecord.id,
        name: `${classRecord.subject} Final`,
        maxMarks: 100,
        startDate: new Date(Date.now() - (10 - index) * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - (9 - index) * 24 * 60 * 60 * 1000),
      },
    ];

    const created = await prisma.exam.createMany({
      data: classExams,
    });

    exams.push(created);
  }

  const allExams = await prisma.exam.findMany({
    where: { schoolId: SCHOOL_ID },
    orderBy: [{ classId: 'asc' }, { startDate: 'asc' }],
  });

  const marks = [];
  for (let index = 0; index < classes.length; index += 1) {
    const classRecord = classes[index];
    const classStudents = classEnrollments
      .filter((entry) => entry.classId === classRecord.id)
      .map((entry) => students.find((student) => student.id === entry.studentId))
      .filter(Boolean);

    const classExams = allExams.filter((exam) => exam.classId === classRecord.id);

    for (const exam of classExams) {
      for (const student of classStudents) {
        const score = 55 + ((index * 7 + Number(student.rollNo.slice(1))) % 40);
        const mark = await prisma.marks.create({
          data: {
            schoolId: SCHOOL_ID,
            examId: exam.id,
            classId: classRecord.id,
            studentId: student.id,
            value: String(score),
            status: score % 11 === 0 ? MarksStatus.SUBMITTED : MarksStatus.DRAFT,
            submittedAt: score % 11 === 0 ? new Date() : null,
          },
        });

        marks.push(mark);
      }
    }
  }

  const requestTypes = [RequestType.EDIT_MARKS, RequestType.ACCESS_REQUEST, RequestType.CORRECTION_REQUEST];
  const requestStatuses = [RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.REJECTED];

  for (let index = 0; index < 20; index += 1) {
    const requester = facultyUsers[index % facultyUsers.length].user;
    const referencedMark = marks[index * 2 % marks.length];

    await prisma.request.create({
      data: {
        schoolId: SCHOOL_ID,
        userId: requester.id,
        type: requestTypes[index % requestTypes.length],
        status: requestStatuses[index % requestStatuses.length],
        marksId: referencedMark.id,
        reason: `Demo request ${index + 1} for classroom workflow validation`,
        response: index % 3 === 0 ? 'Seeded response' : null,
        respondedBy: index % 3 === 0 ? adminUser.id : null,
      },
    });
  }

  const auditEntries = [];
  for (let index = 0; index < 40; index += 1) {
    auditEntries.push({
      schoolId: SCHOOL_ID,
      userId: index % 2 === 0 ? adminUser.id : facultyUsers[index % facultyUsers.length].user.id,
      action: pick(['MARKS_DRAFT_SAVED', 'MARKS_SUBMITTED', 'REQUEST_CREATED', 'REQUEST_APPROVED'], index),
      entity: pick(['marks', 'request', 'class', 'student'], index),
      entityId: pick(marks, index).id,
      changes: { seeded: true, index },
      ipAddress: '127.0.0.1',
    });
  }

  await prisma.auditLog.createMany({
    data: auditEntries,
  });
  console.log('Seed completed');
  console.log('Admin login: principal@school.in / password123');
  console.log('Faculty login: faculty@school.in / password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });