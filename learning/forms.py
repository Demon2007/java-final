from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.models import User


class LoginForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["username"].widget.attrs.update({
            "placeholder": "Введите логин",
        })

        self.fields["password"].widget.attrs.update({
            "placeholder": "Введите пароль",
        })


class RegisterForm(UserCreationForm):
    class Meta:
        model = User
        fields = ["username", "password1", "password2"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["username"].widget.attrs.update({
            "placeholder": "Введите логин",
        })

        self.fields["password1"].widget.attrs.update({
            "placeholder": "Введите пароль",
        })

        self.fields["password2"].widget.attrs.update({
            "placeholder": "Повторите пароль",
        })