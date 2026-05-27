from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    nickname = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    two_factor_secret = Column(String, nullable=True)
    recipes = relationship("Recipe", back_populates="owner", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="owner", cascade="all, delete-orphan")

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    time_cooking = Column(String, nullable=False)
    ingredients = Column(Text, nullable=False)
    quantity = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="recipes")

    schedules = relationship("Schedule", back_populates="recipe", cascade="all, delete-orphan")

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    meal_type = Column(String, nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), index=True, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="schedules")
    recipe = relationship("Recipe", back_populates="schedules")