from django.contrib import admin
from django.utils import timezone

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
    actions = ["reset_hit_count", "prune_old_cache_entries"]

    @admin.display(description="Clé de cache")
    def cache_key_short(self, obj):
        return f"{obj.cache_key[:12]}…"

    @admin.action(description="Réinitialiser le nombre de réutilisations")
    def reset_hit_count(self, request, queryset):
        updated = queryset.update(hit_count=0, last_used_at=timezone.now())
        self.message_user(request, f"{updated} génération(s) réinitialisée(s).")

    @admin.action(description="Supprimer les entrées de cache les plus anciennes")
    def prune_old_cache_entries(self, request, queryset):
        deleted, _ = queryset.filter(created_at__lt=timezone.now() - timezone.timedelta(days=30)).delete()
        self.message_user(request, f"{deleted} entrée(s) de cache supprimée(s).")

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
        "mode",
        "served_from_cache",
        "question_count",
        "score_percent",
        "started_at",
        "completed_at",
    ]
    list_filter = ["exam", "difficulty", "mode", "served_from_cache"]
    search_fields = ["user__phone_number", "user__email"]
    readonly_fields = ["id", "started_at"]
    inlines = [QuestionInline]
    date_hierarchy = "started_at"
    actions = ["mark_completed_manually", "reset_completed_state"]

    @admin.display(description="Questions")
    def question_count(self, obj):
        return obj.questions.count()

    @admin.action(description="Marquer comme terminée (validation manuelle)")
    def mark_completed_manually(self, request, queryset):
        updated = 0
        for session in queryset.filter(completed_at__isnull=True):
            session.completed_at = timezone.now()
            session.score_percent = session.score_percent or 0.0
            session.save(update_fields=["completed_at", "score_percent"])
            updated += 1
        self.message_user(request, f"{updated} session(s) marquée(s) comme terminée(s).")

    @admin.action(description="Réinitialiser l'état terminé")
    def reset_completed_state(self, request, queryset):
        updated = queryset.filter(completed_at__isnull=False).update(completed_at=None, score_percent=None)
        self.message_user(request, f"{updated} session(s) réinitialisée(s).")


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
    list_display = ["title", "user", "exam", "subject", "message_count", "created_at", "updated_at"]
    search_fields = ["title", "user__phone_number", "user__email"]
    list_filter = ["exam", "subject"]
    inlines = [TutorMessageInline]
    actions = ["delete_old_conversations"]

    @admin.display(description="Messages")
    def message_count(self, obj):
        return obj.messages.count()

    @admin.action(description="Supprimer les conversations plus anciennes que 48h")
    def delete_old_conversations(self, request, queryset):
        cutoff = timezone.now() - timezone.timedelta(hours=48)
        deleted, _ = queryset.filter(updated_at__lt=cutoff).delete()
        self.message_user(request, f"{deleted} conversation(s) supprimée(s).")
