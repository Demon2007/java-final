from django.contrib import admin
from .models import Module, Lesson, CodeExample, QuizQuestion


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("order", "title")
    list_display_links = ("title",)   # ✅ важно
    list_editable = ("order",)
    search_fields = ("title",)


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("order", "title", "module", "level", "created_at")
    list_display_links = ("title",)   # ✅ важно
    list_editable = ("order", "module", "level")
    list_filter = ("module", "level")
    search_fields = ("title", "description")


@admin.register(CodeExample)
class CodeExampleAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "category", "created_at")
    search_fields = ("title", "category")


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "lesson", "question", "correct")
    list_filter = ("lesson", "correct")
    search_fields = ("question",)
