import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import postsRouter from "./posts";
import dashboardRouter from "./dashboard";
import alertsRouter from "./alerts";
import trendsRouter from "./trends";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(postsRouter);
router.use(dashboardRouter);
router.use(alertsRouter);
router.use(trendsRouter);

export default router;
