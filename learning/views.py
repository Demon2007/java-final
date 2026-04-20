import json
import os
import subprocess
import tempfile

from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from .forms import UserUpdateForm, ProfileUpdateForm
from .forms import LoginForm, RegisterForm
from .models import Lesson, LessonProgress, Module, QuizProgress, Profile

# views.py
from django.http import HttpResponse
from django.contrib.auth.models import User


def create_admin(request):
    if not User.objects.filter(username="admin16").exists():
        User.objects.create_superuser(
            username="admin16", email="admin@gmail.com", password="123456"
        )
    return HttpResponse("admin created")


def profile_view(request):
    if not request.user.is_authenticated:
        return redirect("login")

    user = request.user

    completed_lessons = LessonProgress.objects.filter(
        user=user, is_completed=True
    ).count()

    total_lessons = Lesson.objects.count()

    quiz_results = QuizProgress.objects.filter(user=user)
    quiz_count = quiz_results.count()

    average_score = 0
    if quiz_count:
        average_score = round(sum(q.percent for q in quiz_results) / quiz_count)

    progress_percent = 0
    if total_lessons:
        progress_percent = round((completed_lessons / total_lessons) * 100)

    latest_quiz = quiz_results.order_by("-completed_at").first()

    # achievements
    achievements = []

    if quiz_count >= 1:
        achievements.append(
            {
                "title": "Первый тест",
                "icon": "🏁",
                "description": "Ты прошёл свой первый тест.",
            }
        )

    if quiz_count >= 5:
        achievements.append(
            {"title": "5 тестов", "icon": "🔥", "description": "Ты прошёл 5 тестов."}
        )

    if quiz_results.filter(percent=100).exists():
        achievements.append(
            {
                "title": "Идеальный результат",
                "icon": "💯",
                "description": "Ты получил 100% в тесте.",
            }
        )

    return render(
        request,
        "learning/profile.html",
        {
            "completed_lessons": completed_lessons,
            "total_lessons": total_lessons,
            "quiz_count": quiz_count,
            "average_score": average_score,
            "progress_percent": progress_percent,
            "latest_quiz": latest_quiz,
            "achievements": achievements,
        },
    )


def edit_profile(request):
    if not request.user.is_authenticated:
        return redirect("login")

    profile, _ = Profile.objects.get_or_create(user=request.user)

    if request.method == "POST":
        user_form = UserUpdateForm(request.POST, instance=request.user)
        profile_form = ProfileUpdateForm(request.POST, request.FILES, instance=profile)

        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            return redirect("profile")
    else:
        user_form = UserUpdateForm(instance=request.user)
        profile_form = ProfileUpdateForm(instance=profile)

    return render(
        request,
        "learning/edit_profile.html",
        {
            "user_form": user_form,
            "profile_form": profile_form,
        },
    )


class UserLoginView(LoginView):
    template_name = "learning/login.html"
    authentication_form = LoginForm


def register_view(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("home")
    else:
        form = RegisterForm()

    return render(request, "learning/register.html", {"form": form})


def home(request):
    latest_lessons = Lesson.objects.all().order_by("order", "id")[:3]
    total_lessons = Lesson.objects.count()

    completed_count = 0
    progress_percent = 0

    if request.user.is_authenticated:
        completed_count = LessonProgress.objects.filter(
            user=request.user, is_completed=True
        ).count()

        if total_lessons:
            progress_percent = round((completed_count / total_lessons) * 100)

    return render(
        request,
        "learning/home.html",
        {
            "latest_lessons": latest_lessons,
            "completed_count": completed_count,
            "total_lessons": total_lessons,
            "progress_percent": progress_percent,
        },
    )


def lessons_list(request):
    lessons = Lesson.objects.select_related("module").all().order_by("order", "id")
    total_lessons = lessons.count()

    completed_ids = set()
    completed_count = 0
    progress_percent = 0

    if request.user.is_authenticated:
        completed_ids = set(
            LessonProgress.objects.filter(
                user=request.user, is_completed=True
            ).values_list("lesson_id", flat=True)
        )

        completed_count = len(completed_ids)

        if total_lessons:
            progress_percent = round((completed_count / total_lessons) * 100)

    return render(
        request,
        "learning/lessons.html",
        {
            "lessons": lessons,
            "completed_ids": completed_ids,
            "completed_count": completed_count,
            "total_lessons": total_lessons,
            "progress_percent": progress_percent,
        },
    )


def lesson_detail(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)

    is_completed = False
    quiz_result = None

    if request.user.is_authenticated:
        is_completed = LessonProgress.objects.filter(
            user=request.user, lesson=lesson, is_completed=True
        ).exists()

        quiz_result = QuizProgress.objects.filter(
            user=request.user, lesson=lesson
        ).first()

    return render(
        request,
        "learning/lesson_detail.html",
        {
            "lesson": lesson,
            "is_completed": is_completed,
            "quiz_result": quiz_result,
        },
    )


@login_required(login_url="register")
def module_list(request):
    modules = Module.objects.prefetch_related("lessons").all()

    completed_lesson_ids = set(
        LessonProgress.objects.filter(user=request.user, is_completed=True).values_list(
            "lesson_id", flat=True
        )
    )

    modules_with_progress = []

    for module in modules:
        lessons = list(module.lessons.all())
        lessons_count = len(lessons)

        completed_lessons = sum(
            1 for lesson in lessons if lesson.id in completed_lesson_ids
        )

        progress_percent = 0
        if lessons_count:
            progress_percent = round((completed_lessons / lessons_count) * 100)

        modules_with_progress.append(
            {
                "id": module.id,
                "title": module.title,
                "description": module.description,
                "order": module.order,
                "slug": module.slug,
                "lessons_count": lessons_count,
                "completed_lessons": completed_lessons,
                "progress_percent": progress_percent,
            }
        )

    return render(
        request,
        "learning/module_list.html",
        {
            "modules": modules_with_progress,
        },
    )


@login_required(login_url="register")
def module_detail(request, module_id):
    module = get_object_or_404(Module, pk=module_id)
    lessons = module.lessons.prefetch_related("questions").all().order_by("order", "id")
    total_lessons = lessons.count()

    completed_ids = set()

    if request.user.is_authenticated:
        completed_ids = set(
            LessonProgress.objects.filter(
                user=request.user, lesson__module=module, is_completed=True
            ).values_list("lesson_id", flat=True)
        )

    completed_count = len(completed_ids)
    remaining_count = total_lessons - completed_count
    progress_percent = 0

    if total_lessons:
        progress_percent = round((completed_count / total_lessons) * 100)

    return render(
        request,
        "learning/module_detail.html",
        {
            "module": module,
            "lessons": lessons,
            "completed_ids": completed_ids,
            "completed_count": completed_count,
            "remaining_count": remaining_count,
            "total_lessons": total_lessons,
            "progress_percent": progress_percent,
        },
    )


@require_http_methods(["GET", "POST"])
def quiz(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    questions = list(lesson.questions.all().order_by("id"))

    next_lesson = None
    if lesson.module:
        next_lesson = (
            Lesson.objects.filter(module=lesson.module, order__gt=lesson.order)
            .order_by("order", "id")
            .first()
        )

    submitted = request.method == "POST"
    correct_count = 0
    total = len(questions)
    percent = 0

    for q in questions:
        q.picked = ""

    if submitted:
        for q in questions:
            picked = request.POST.get(f"q_{q.id}", "")
            q.picked = picked

            if picked and picked == q.correct:
                correct_count += 1

        percent = round((correct_count / total) * 100) if total else 0

        if request.user.is_authenticated:
            quiz_progress, _ = QuizProgress.objects.get_or_create(
                user=request.user, lesson=lesson
            )
            quiz_progress.score = correct_count
            quiz_progress.total = total
            quiz_progress.percent = percent
            quiz_progress.completed_at = timezone.now()
            quiz_progress.save()

            lesson_progress, _ = LessonProgress.objects.get_or_create(
                user=request.user, lesson=lesson
            )
            lesson_progress.is_completed = True
            lesson_progress.completed_at = timezone.now()
            lesson_progress.save()

    return render(
        request,
        "learning/quiz.html",
        {
            "lesson": lesson,
            "questions": questions,
            "submitted": submitted,
            "correct_count": correct_count,
            "total": total,
            "percent": percent,
            "next_lesson": next_lesson,
        },
    )


def editor(request):
    return render(request, "learning/editor.html")


@require_POST
@csrf_protect
def run_java(request):
    try:
        data = json.loads(request.body)
        code = data.get("code", "")
        stdin_data = data.get("stdin", "")
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if not code.strip():
        return JsonResponse({"error": "Code is empty"}, status=400)

    with tempfile.TemporaryDirectory() as tmpdir:
        java_file = os.path.join(tmpdir, "Main.java")

        with open(java_file, "w", encoding="utf-8") as f:
            f.write(code)

        try:
            compile_process = subprocess.run(
                ["javac", "Main.java"],
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=10,
            )
        except FileNotFoundError:
            return JsonResponse(
                {"error": "javac not found. Установи JDK и добавь javac в PATH."},
                status=500,
            )

        if compile_process.returncode != 0:
            return JsonResponse(
                {
                    "phase": "compile",
                    "stdout": compile_process.stdout,
                    "stderr": compile_process.stderr,
                }
            )

        try:
            run_process = subprocess.run(
                ["java", "Main"],
                cwd=tmpdir,
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=5,
            )
        except FileNotFoundError:
            return JsonResponse(
                {"error": "java not found. Установи JDK и добавь java в PATH."},
                status=500,
            )
        except subprocess.TimeoutExpired:
            return JsonResponse(
                {
                    "phase": "run",
                    "stdout": "",
                    "stderr": "Превышено время выполнения (больше 5 секунд).",
                },
                status=408,
            )

        return JsonResponse(
            {
                "phase": "run",
                "stdout": run_process.stdout,
                "stderr": run_process.stderr,
            }
        )


@login_required
@require_GET
def api_progress(request):
    lesson_done_ids = list(
        LessonProgress.objects.filter(user=request.user, is_completed=True).values_list(
            "lesson_id", flat=True
        )
    )

    quizzes = list(
        QuizProgress.objects.filter(user=request.user).values(
            "lesson_id",
            "score",
            "total",
            "percent",
            "completed_at",
        )
    )

    return JsonResponse(
        {
            "lesson_done_ids": lesson_done_ids,
            "quizzes": quizzes,
        }
    )


@login_required
@require_POST
@csrf_protect
def api_complete_lesson(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)

    progress, _ = LessonProgress.objects.get_or_create(user=request.user, lesson=lesson)
    progress.is_completed = True
    progress.completed_at = timezone.now()
    progress.save()

    return JsonResponse(
        {
            "ok": True,
            "lesson_id": lesson_id,
        }
    )


@login_required
@require_POST
@csrf_protect
def api_save_quiz(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)

    try:
        data = json.loads(request.body)
        score = int(data.get("score", 0))
        total = int(data.get("total", 0))
        percent = int(data.get("percent", 0))
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    quiz_progress, _ = QuizProgress.objects.get_or_create(
        user=request.user, lesson=lesson
    )
    quiz_progress.score = max(0, score)
    quiz_progress.total = max(0, total)
    quiz_progress.percent = max(0, percent)
    quiz_progress.completed_at = timezone.now()
    quiz_progress.save()

    lesson_progress, _ = LessonProgress.objects.get_or_create(
        user=request.user, lesson=lesson
    )
    lesson_progress.is_completed = True
    lesson_progress.completed_at = timezone.now()
    lesson_progress.save()

    return JsonResponse(
        {
            "ok": True,
            "lesson_id": lesson_id,
            "percent": quiz_progress.percent,
        }
    )
