from django.db import models
from django.utils.text import slugify
from django.conf import settings
from django.utils import timezone


class Module(models.Model):
    title = models.CharField("Модуль", max_length=200)
    slug = models.SlugField("Slug", unique=True, blank=True)
    description = models.TextField("Описание", blank=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Модуль"
        verbose_name_plural = "Модули"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Lesson(models.Model):
    LEVELS = (
        ("beginner", "Начинающий"),
        ("middle", "Средний"),
        ("advanced", "Продвинутый"),
    )

    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name="lessons",
        verbose_name="Модуль",
        null=True,
        blank=True,
    )

    title = models.CharField("Название", max_length=200)
    description = models.TextField("Описание", blank=True)
    content = models.TextField("Контент", blank=True)
    order = models.PositiveIntegerField("Порядок", default=0)
    level = models.CharField("Уровень", max_length=20, choices=LEVELS, default="beginner")
    created_at = models.DateTimeField("Создано", auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Урок"
        verbose_name_plural = "Уроки"

    def __str__(self):
        return self.title


class CodeExample(models.Model):
    title = models.CharField("Название", max_length=200)
    code = models.TextField("Код")
    category = models.CharField("Категория", max_length=100, blank=True)
    created_at = models.DateTimeField("Создано", auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "Пример кода"
        verbose_name_plural = "Примеры кода"

    def __str__(self):
        return self.title


class QuizQuestion(models.Model):
    lesson = models.ForeignKey(
        "learning.Lesson",
        on_delete=models.CASCADE,
        related_name="questions",
        verbose_name="Урок",
        null=True,
        blank=True
    )
    question = models.CharField("Вопрос", max_length=500)
    option_a = models.CharField("Вариант A", max_length=300)
    option_b = models.CharField("Вариант B", max_length=300)
    option_c = models.CharField("Вариант C", max_length=300)
    option_d = models.CharField("Вариант D", max_length=300)
    correct = models.CharField(
        "Правильный вариант",
        max_length=1,
        choices=[("A", "A"), ("B", "B"), ("C", "C"), ("D", "D")]
    )
    explanation = models.TextField("Пояснение", blank=True)

    class Meta:
        verbose_name = "Вопрос теста"
        verbose_name_plural = "Вопросы тестов"

    def __str__(self):
        return self.question[:60]


class LessonProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lesson_progress",
        verbose_name="Пользователь",
    )
    lesson = models.ForeignKey(
        "learning.Lesson",
        on_delete=models.CASCADE,
        related_name="progress_records",
        verbose_name="Урок",
    )
    is_completed = models.BooleanField("Пройден", default=False)
    completed_at = models.DateTimeField("Дата прохождения", null=True, blank=True)

    class Meta:
        unique_together = ("user", "lesson")
        verbose_name = "Прогресс урока"
        verbose_name_plural = "Прогресс уроков"

    def __str__(self):
        return f"{self.user} - {self.lesson} - {'done' if self.is_completed else 'no'}"


class QuizProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quiz_progress",
        verbose_name="Пользователь",
    )
    lesson = models.ForeignKey(
        "learning.Lesson",
        on_delete=models.CASCADE,
        related_name="quiz_records",
        verbose_name="Урок (тест)",
    )
    score = models.PositiveIntegerField("Правильных ответов", default=0)
    total = models.PositiveIntegerField("Всего вопросов", default=0)
    percent = models.PositiveIntegerField("Процент", default=0)
    completed_at = models.DateTimeField("Дата прохождения", default=timezone.now)

    class Meta:
        unique_together = ("user", "lesson")
        verbose_name = "Результат теста"
        verbose_name_plural = "Результаты тестов"

    def __str__(self):
        return f"{self.user} - quiz for lesson {self.lesson_id} - {self.percent}%"