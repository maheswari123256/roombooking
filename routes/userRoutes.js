const router=require('express').Router();
const{register,login,saveFcmToken}=require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
router.post('/register',register);
router.post('/login',login);
router.post('/save-fcm',authMiddleware,saveFcmToken)
module.exports=router;