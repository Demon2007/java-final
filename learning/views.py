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

from .forms import LoginForm, RegisterForm
from .models import Lesson, LessonProgress, Module, QuizProgress


class UserLoginView(LoginView):
    template_name = "learning/login.html"
    authentication_form = LoginForm


def register_view(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)  # сразу вход после регистрации
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
            user=request.user,
            is_completed=True
        ).count()

        progress_percent = round((completed_count / total_lessons) * 100) if total_lessons else 0

    context = {
        "latest_lessons": latest_lessons,
        "total_lessons": total_lessons,
        "completed_count": completed_count,
        "progress_percent": progress_percent,
    }
    return render(request, "learning/home.html", context)


def lessons_list(request):
    lessons = Lesson.objects.select_related("module").all().order_by("order", "id")
    total_lessons = lessons.count()

    completed_ids = set()
    completed_count = 0
    progress_percent = 0

    if request.user.is_authenticated:
        completed_ids = set(
            LessonProgress.objects.filter(
                user=request.user,
                is_completed=True
            ).values_list("lesson_id", flat=True)
        )
        completed_count = len(completed_ids)
        progress_percent = round((completed_count / total_lessons) * 100) if total_lessons else 0

    context = {
        "lessons": lessons,
        "completed_ids": completed_ids,
        "completed_count": completed_count,
        "total_lessons": total_lessons,
        "progress_percent": progress_percent,
    }
    return render(request, "learning/lessons.html", context)


def lesson_detail(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)

    is_completed = False
    quiz_result = None

    if request.user.is_authenticated:
        is_completed = LessonProgress.objects.filter(
            user=request.user,
            lesson=lesson,
            is_completed=True
        ).exists()

        quiz_result = QuizProgress.objects.filter(
            user=request.user,
            lesson=lesson
        ).first()

    context = {
        "lesson": lesson,
        "is_completed": is_completed,
        "quiz_result": quiz_result,
    }
    return render(request, "learning/lesson_detail.html", context)


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

        compile_process = subprocess.run(
            ["javac", "Main.java"],
            cwd=tmpdir,
            capture_output=True,
            text=True
        )

        if compile_process.returncode != 0:
            return JsonResponse({
                "phase": "compile",
                "stdout": compile_process.stdout,
                "stderr": compile_process.stderr
            })

        try:
            run_process = subprocess.run(
                ["java", "Main"],
                cwd=tmpdir,
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=5
            )
        except subprocess.TimeoutExpired:
            return JsonResponse({
                "phase": "run",
                "stdout": "",
                "stderr": "Превышено время выполнения (больше 5 секунд)."
            }, status=408)

        return JsonResponse({
            "phase": "run",
            "stdout": run_process.stdout,
            "stderr": run_process.stderr
        })


def module_list(request):
    modules = Module.objects.all().order_by("order", "id")
    return render(request, "learning/module_list.html", {"modules": modules})


def module_detail(request, module_id):
    module = get_object_or_404(Module, pk=module_id)
    lessons = module.lessons.all().order_by("order", "id")

    completed_ids = set()

    if request.user.is_authenticated:
        completed_ids = set(
            LessonProgress.objects.filter(
                user=request.user,
                lesson__module=module,
                is_completed=True
            ).values_list("lesson_id", flat=True)
        )

    context = {
        "module": module,
        "lessons": lessons,
        "completed_ids": completed_ids,
    }
    return render(request, "learning/module_detail.html", context)


@require_http_methods(["GET", "POST"])
def quiz(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    questions = list(lesson.questions.all().order_by("id"))

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
                user=request.user,
                lesson=lesson
            )
            quiz_progress.score = correct_count
            quiz_progress.total = total
            quiz_progress.percent = percent
            quiz_progress.completed_at = timezone.now()
            quiz_progress.save()

            # если хочешь, чтобы после прохождения теста урок считался пройденным
            lesson_progress, _ = LessonProgress.objects.get_or_create(
                user=request.user,
                lesson=lesson
            )
            lesson_progress.is_completed = True
            lesson_progress.completed_at = timezone.now()
            lesson_progress.save()

    context = {
        "lesson": lesson,
        "questions": questions,
        "submitted": submitted,
        "correct_count": correct_count,
        "total": total,
        "percent": percent,
    }
    return render(request, "learning/quiz.html", context)


@login_required
@require_GET
def api_progress(request):
    lesson_done_ids = list(
        LessonProgress.objects.filter(
            user=request.user,
            is_completed=True
        ).values_list("lesson_id", flat=True)
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

    return JsonResponse({
        "lesson_done_ids": lesson_done_ids,
        "quizzes": quizzes,
    })


@login_required
@require_POST
@csrf_protect
def api_complete_lesson(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)

    progress, _ = LessonProgress.objects.get_or_create(
        user=request.user,
        lesson=lesson
    )
    progress.is_completed = True
    progress.completed_at = timezone.now()
    progress.save()

    return JsonResponse({
        "ok": True,
        "lesson_id": lesson_id,
    })


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
        user=request.user,
        lesson=lesson
    )
    quiz_progress.score = max(0, score)
    quiz_progress.total = max(0, total)
    quiz_progress.percent = max(0, percent)
    quiz_progress.completed_at = timezone.now()
    quiz_progress.save()

    # если прохождение теста = завершение урока
    lesson_progress, _ = LessonProgress.objects.get_or_create(
        user=request.user,
        lesson=lesson
    )
    lesson_progress.is_completed = True
    lesson_progress.completed_at = timezone.now()
    lesson_progress.save()

    return JsonResponse({
        "ok": True,
        "lesson_id": lesson_id,
        "percent": quiz_progress.percent,
    })




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

from .forms import LoginForm, RegisterForm
from .models import Lesson, LessonProgress, Module, QuizProgress


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
            user=request.user,
            is_completed=True
        ).count()
        progress_percent = round((completed_count / total_lessons) * 100) if total_lessons else 0

    return render(request, "learning/home.html", {
        "latest_lessons": latest_lessons,
        "completed_count": completed_count,
        "total_lessons": total_lessons,
        "progress_percent": progress_percent,
    })


def lessons_list(request):
    lessons = Lesson.objects.all().order_by("order", "id")
    total_lessons = lessons.count()

    completed_ids = set()
    completed_count = 0
    progress_percent = 0

    if request.user.is_authenticated:
        completed_ids = set(
            LessonProgress.objects.filter(
                user=request.user,
                is_completed=True
            ).values_list("lesson_id", flat=True)
        )
        completed_count = len(completed_ids)
        progress_percent = round((completed_count / total_lessons) * 100) if total_lessons else 0

    return render(request, "learning/lessons.html", {
        "lessons": lessons,
        "completed_ids": completed_ids,
        "completed_count": completed_count,
        "total_lessons": total_lessons,
        "progress_percent": progress_percent,
    })


def lesson_detail(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)

    is_completed = False
    quiz_result = None

    if request.user.is_authenticated:
        is_completed = LessonProgress.objects.filter(
            user=request.user,
            lesson=lesson,
            is_completed=True
        ).exists()

        quiz_result = QuizProgress.objects.filter(
            user=request.user,
            lesson=lesson
        ).first()

    return render(request, "learning/lesson_detail.html", {
        "lesson": lesson,
        "is_completed": is_completed,
        "quiz_result": quiz_result,
    })


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
                timeout=10
            )
        except FileNotFoundError:
            return JsonResponse({
                "error": "javac not found. Установи JDK и добавь javac в PATH."
            }, status=500)

        if compile_process.returncode != 0:
            return JsonResponse({
                "phase": "compile",
                "stdout": compile_process.stdout,
                "stderr": compile_process.stderr
            })

        try:
            run_process = subprocess.run(
                ["java", "Main"],
                cwd=tmpdir,
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=5
            )
        except FileNotFoundError:
            return JsonResponse({
                "error": "java not found. Установи JDK и добавь java в PATH."
            }, status=500)
        except subprocess.TimeoutExpired:
            return JsonResponse({
                "phase": "run",
                "stdout": "",
                "stderr": "Превышено время выполнения (больше 5 секунд)."
            }, status=408)

        return JsonResponse({
            "phase": "run",
            "stdout": run_process.stdout,
            "stderr": run_process.stderr
        })


def module_list(request):
    modules = Module.objects.all().order_by("order", "id")
    return render(request, "learning/module_list.html", {"modules": modules})


def module_detail(request, module_id):
    module = get_object_or_404(Module, pk=module_id)
    lessons = module.lessons.all().order_by("order", "id")
    total_lessons = lessons.count()

    completed_ids = set()
    completed_count = 0
    progress_percent = 0

    if request.user.is_authenticated:
        completed_ids = set(
            LessonProgress.objects.filter(
                user=request.user,
                lesson__module=module,
                is_completed=True
            ).values_list("lesson_id", flat=True)
        )
        completed_count = len(completed_ids)
        progress_percent = round((completed_count / total_lessons) * 100) if total_lessons else 0

    return render(request, "learning/module_detail.html", {
        "module": module,
        "lessons": lessons,
        "completed_ids": completed_ids,
        "completed_count": completed_count,
        "total_lessons": total_lessons,
        "progress_percent": progress_percent,
    })


@require_http_methods(["GET", "POST"])
def quiz(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    questions = list(lesson.questions.all().order_by("id"))

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
                user=request.user,
                lesson=lesson
            )
            quiz_progress.score = correct_count
            quiz_progress.total = total
            quiz_progress.percent = percent
            quiz_progress.completed_at = timezone.now()
            quiz_progress.save()

            lesson_progress, _ = LessonProgress.objects.get_or_create(
                user=request.user,
                lesson=lesson
            )
            lesson_progress.is_completed = True
            lesson_progress.completed_at = timezone.now()
            lesson_progress.save()

    return render(request, "learning/quiz.html", {
        "lesson": lesson,
        "questions": questions,
        "submitted": submitted,
        "correct_count": correct_count,
        "total": total,
        "percent": percent,
    })


@login_required
@require_GET
def api_progress(request):
    lesson_done_ids = list(
        LessonProgress.objects.filter(
            user=request.user,
            is_completed=True
        ).values_list("lesson_id", flat=True)
    )

    quizzes = list(
        QuizProgress.objects.filter(user=request.user).values(
            "lesson_id", "score", "total", "percent", "completed_at"
        )
    )

    return JsonResponse({
        "lesson_done_ids": lesson_done_ids,
        "quizzes": quizzes,
    })


@login_required
@require_POST
@csrf_protect
def api_complete_lesson(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)

    progress, _ = LessonProgress.objects.get_or_create(
        user=request.user,
        lesson=lesson
    )
    progress.is_completed = True
    progress.completed_at = timezone.now()
    progress.save()

    return JsonResponse({"ok": True, "lesson_id": lesson_id})