from django.contrib import admin

from .models import Exam, Subject, Topic


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 1
    fields = ["name", "order", "syllabus_reference"]


class SubjectInline(admin.TabularInline):
    model = Subject
    extra = 1
    fields = ["name", "coefficient", "order"]
    show_change_link = True


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "organizing_body", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "code", "organizing_body"]
    prepopulated_fields = {"code": ("name",)}
    inlines = [SubjectInline]


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ["name", "exam", "coefficient", "order"]
    list_filter = ["exam"]
    search_fields = ["name"]
    inlines = [TopicInline]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ["name", "subject", "order"]
    list_filter = ["subject__exam", "subject"]
    search_fields = ["name", "syllabus_reference"]
