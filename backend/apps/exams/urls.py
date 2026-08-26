from rest_framework.routers import DefaultRouter

from . import views

app_name = "exams"

router = DefaultRouter()
router.register("exams", views.ExamViewSet, basename="exam")
router.register("subjects", views.SubjectViewSet, basename="subject")
router.register("topics", views.TopicViewSet, basename="topic")

urlpatterns = router.urls
