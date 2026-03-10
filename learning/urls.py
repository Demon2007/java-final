from django.urls import path
from django.contrib.auth.views import LogoutView
from . import views

urlpatterns = [
    path("", views.home, name="home"),

    path("lessons/", views.lessons_list, name="lessons_list"),
    path("lessons/<int:lesson_id>/", views.lesson_detail, name="lesson_detail"),
    path("lessons/<int:lesson_id>/quiz/", views.quiz, name="quiz"),

    path("modules/", views.module_list, name="module_list"),
    path("modules/<int:module_id>/", views.module_detail, name="module_detail"),

    path("editor/", views.editor, name="editor"),
    path("api/run-java/", views.run_java, name="run_java"),

    path("register/", views.register_view, name="register"),
    path("login/", views.UserLoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(next_page="home"), name="logout"),

    path("api/progress/", views.api_progress, name="api_progress"),
    path("api/lessons/<int:lesson_id>/complete/", views.api_complete_lesson, name="api_complete_lesson"),
]