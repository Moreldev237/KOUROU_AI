from django.contrib import admin

from .models import CachedGeneration, Question, QCMSession, TutorConversation, TutorMessage, UserAnswer


@admin.register(CachedGeneration)
class CachedGenerationAdmin(admin.ModelAdmin):
    list_display = [
        "cache_key_short",
        "exam",
        "subject",
        "topic",
        "difficulty",
        "question_count",
        "hit_count",
        "tokens_used_on_generation",
        "created_at",
    ]
    list_filter = ["exam", "difficulty", "mode"]
    search_fields = ["cache_key"]
    readonly_fields = [f.name for f in CachedGeneration._meta.fields]

    @admin.display(description="Clé de cache")
    def cache_key_short(self, obj):
        return f"{obj.cache_key[:12]}…"

    def has_add_permission(self, request):
        return False


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    fields = ["order", "question_text", "correct_choice_key"]
    readonly_fields = ["order", "question_text", "correct_choice_key"]
    can_delete = False


@admin.register(QCMSession)
class QCMSessionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "exam",
        "subject",
        "difficulty",
        "served_from_cache",
        "score_percent",
        "started_at",
        "completed_at",
    ]
    list_filter = ["exam", "difficulty", "served_from_cache"]
    search_fields = ["user__phone_number", "user__email"]
    readonly_fields = ["id", "started_at"]
    inlines = [QuestionInline]
    date_hierarchy = "started_at"


@admin.register(UserAnswer)
class UserAnswerAdmin(admin.ModelAdmin):
    list_display = ["question", "selected_choice_key", "is_correct", "answered_at"]
    list_filter = ["is_correct"]

    def has_add_permission(self, request):
        return False


class TutorMessageInline(admin.TabularInline):
    model = TutorMessage
    extra = 0
    readonly_fields = ["role", "content", "tokens_used", "created_at"]
    can_delete = False


@admin.register(TutorConversation)
class TutorConversationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "exam", "subject", "created_at", "updated_at"]
    search_fields = ["title", "user__phone_number", "user__email"]
    inlines = [TutorMessageInline]
