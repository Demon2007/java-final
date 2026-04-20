from django.urls import path
from django.contrib.auth.views import LogoutView
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("create-admin/", create_admin),
    path("lessons/", views.lessons_list, name="lessons_list"),
    path("lessons/<int:lesson_id>/", views.lesson_detail, name="lesson_detail"),
    path("lessons/<int:lesson_id>/quiz/", views.quiz, name="quiz"),
    path("tests/", views.module_list, name="tests_list"),
    path("tests/<int:module_id>/", views.module_detail, name="test_detail"),
    path("profile/", views.profile_view, name="profile"),
    path("profile/edit/", views.edit_profile, name="edit_profile"),
    path("editor/", views.editor, name="editor"),
    path("api/run-java/", views.run_java, name="run_java"),
    path("register/", views.register_view, name="register"),
    path("login/", views.UserLoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(next_page="home"), name="logout"),
    path("api/progress/", views.api_progress, name="api_progress"),
    path(
        "api/lessons/<int:lesson_id>/complete/",
        views.api_complete_lesson,
        name="api_complete_lesson",
    ),
]
