# routes/__init__.py
from fastapi import APIRouter
from controllers.user_controller import router as user_router
from controllers.profile_controller import router as profile_router

router = APIRouter()

router.include_router(user_router, prefix="/users", tags=["Users"])
router.include_router(profile_router, prefix="/profiles", tags=["Profiles"])
