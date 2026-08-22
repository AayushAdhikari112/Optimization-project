CC = gcc
CFLAGS = -Wall -Wextra -Iinclude
LDFLAGS = -lpsapi -lws2_32 -ladvapi32

SRC_DIR = src
OBJ_DIR = build
INC_DIR = include

SRCS = $(wildcard $(SRC_DIR)/*.c)
OBJS = $(patsubst $(SRC_DIR)/%.c,$(OBJ_DIR)/%.o,$(SRCS))
TARGET = $(OBJ_DIR)/opt_tool.exe

.PHONY: all clean

all: $(OBJ_DIR) $(TARGET)

$(OBJ_DIR):
	-mkdir $(OBJ_DIR)

$(TARGET): $(OBJS)
	$(CC) $(OBJS) -o $@ $(LDFLAGS)

$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	-rmdir /s /q $(OBJ_DIR)
