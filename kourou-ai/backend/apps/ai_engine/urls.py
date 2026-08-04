from django.urls import path

from . import views

app_name = "ai_engine"

urlpatterns = [
    # QCM & Exercices
    path("qcm/generate/", views.GenerateQCMView.as_view(), name="qcm-generate"),
    path("qcm/answer/", views.SubmitAnswerView.as_view(), name="qcm-answer"),
    path("qcm/history/", views.QCMSessionHistoryView.as_view(), name="qcm-history"),
    path("qcm/sessions/<uuid:id>/", views.QCMSessionDetailView.as_view(), name="qcm-session-detail"),
    # Tuteur IA
    path("tutor/chat/", views.TutorChatView.as_view(), name="tutor-chat"),
    path("tutor/conversations/", views.TutorConversationListView.as_view(), name="tutor-conversations"),
    path(
        "tutor/conversations/<uuid:conversation_id>/messages/",
        views.TutorConversationMessagesView.as_view(),
        name="tutor-conversation-messages",
    ),
]
