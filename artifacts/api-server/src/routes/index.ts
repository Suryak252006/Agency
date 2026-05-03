import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import classesRouter from "./classes.js";
import rbacRouter from "./rbac.js";
import marksRouter from "./marks.js";
import adminRouter from "./admin.js";
import facultyRouter from "./faculty.js";
import academicYearsRouter from "./v1/academic-years.js";
import gradesRouter from "./v1/grades.js";
import sectionsRouter from "./v1/sections.js";
import subjectsRouter from "./v1/subjects.js";
import schoolRouter from "./v1/school.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(classesRouter);
router.use(rbacRouter);
router.use(marksRouter);
router.use(adminRouter);
router.use(facultyRouter);

router.use("/v1", academicYearsRouter);
router.use("/v1", gradesRouter);
router.use("/v1", sectionsRouter);
router.use("/v1", subjectsRouter);
router.use("/v1", schoolRouter);

export default router;
