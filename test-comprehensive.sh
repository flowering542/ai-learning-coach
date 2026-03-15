#!/bin/bash
# AI Learning Coach - 全面测试脚本

echo "=========================================="
echo "AI Learning Coach 全面测试报告"
echo "=========================================="
echo ""

# 测试用户ID
TEST_USER="test_user_$(date +%s)"
PLATFORM="feishu"
ADMIN_IDS="ou_59a71f8c62233d851385b132dcc8c09c"

echo "测试用户: $TEST_USER"
echo "测试时间: $(date)"
echo ""

# 函数: 调用coach tool
call_coach() {
    local cmd="$1"
    node -e "
        const { coachTool } = require('./coach-entry.js');
        coachTool('$cmd', '$TEST_USER', '$PLATFORM', '$ADMIN_IDS'.split(',')).then(r => {
            console.log(r.result || r.error || '无返回');
            process.exit(0);
        }).catch(e => {
            console.log('错误:', e.message);
            process.exit(1);
        });
    " 2>&1 | head -50
}

echo "=========================================="
echo "一、冒烟测试"
echo "=========================================="
echo ""

echo "1. 测试 /帮助 命令..."
RESULT=$(call_coach "/帮助")
if echo "$RESULT" | grep -q "命令指南"; then
    echo "   ✅ PASS - 帮助命令正常"
else
    echo "   ❌ FAIL - 帮助命令异常"
fi
echo ""

echo "2. 测试 /练习 命令..."
RESULT=$(call_coach "/练习")
if echo "$RESULT" | grep -q "题目"; then
    echo "   ✅ PASS - 练习命令正常"
else
    echo "   ❌ FAIL - 练习命令异常"
fi
echo ""

echo "3. 测试答题流程..."
# 先开始练习
call_coach "/练习" > /dev/null
# 模拟答题A
RESULT=$(call_coach "A")
if echo "$RESULT" | grep -q "正确\|错误"; then
    echo "   ✅ PASS - 答题反馈正常"
else
    echo "   ❌ FAIL - 答题反馈异常"
fi
echo ""

echo "4. 测试 /进度 命令..."
RESULT=$(call_coach "/进度")
if echo "$RESULT" | grep -q "学习进度\|答题数"; then
    echo "   ✅ PASS - 进度命令正常"
else
    echo "   ❌ FAIL - 进度命令异常"
fi
echo ""

echo "=========================================="
echo "二、人性化反馈测试 (核心价值观)"
echo "=========================================="
echo ""

echo "测试答错时的反馈..."
# 创建新用户，确保答错
TEST_USER2="test_wrong_$(date +%s)"
call_coach2() {
    local cmd="$1"
    node -e "
        const { coachTool } = require('./coach-entry.js');
        coachTool('$cmd', '$TEST_USER2', '$PLATFORM', '$ADMIN_IDS'.split(',')).then(r => {
            console.log(r.result || r.error || '无返回');
            process.exit(0);
        }).catch(e => {
            console.log('错误:', e.message);
            process.exit(1);
        });
    " 2>&1
}

# 开始练习并故意答错（多答几次确保有错题）
call_coach2 "/练习" > /dev/null
call_coach2 "A" > /dev/null
call_coach2 "继续" > /dev/null
RESULT=$(call_coach2 "A")

echo "反馈内容预览:"
echo "$RESULT" | head -15 | sed 's/^/   /'
echo ""

# 检查是否包含人性化元素
HUMANIZED=0
if echo "$RESULT" | grep -q "别灰心"; then
    echo "   ✅ 包含情感安抚"
    HUMANIZED=$((HUMANIZED+1))
fi
if echo "$RESULT" | grep -q "当时是怎么想的"; then
    echo "   ✅ 包含引导反思"
    HUMANIZED=$((HUMANIZED+1))
fi
if echo "$RESULT" | grep -q "学习统计"; then
    echo "   ✅ 包含数据统计"
    HUMANIZED=$((HUMANIZED+1))
fi
if echo "$RESULT" | grep -q "连续打卡"; then
    echo "   ✅ 包含打卡记录"
    HUMANIZED=$((HUMANIZED+1))
fi

echo ""
echo "人性化评分: $HUMANIZED/4"
if [ $HUMANIZED -ge 3 ]; then
    echo "   ✅ 核心价值观符合"
else
    echo "   ❌ 需要改进"
fi
echo ""

echo "=========================================="
echo "三、数据准确性测试"
echo "=========================================="
echo ""

echo "检查题库数据..."
node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('./data/questions-v2-final.json', 'utf8'));
    console.log('   题目总数:', data.length);
    console.log('   基础知识:', data.filter(q => q.dimension === '基础知识').length);
    console.log('   相关专业知识:', data.filter(q => q.dimension === '相关专业知识').length);
    console.log('   专业知识:', data.filter(q => q.dimension === '专业知识').length);
    console.log('   专业实践:', data.filter(q => q.dimension === '专业实践').length);
" 2>&1

echo ""
echo "检查学员数据..."
ls -1 ./data/students/*.json 2>/dev/null | wc -l | xargs echo "   学员文件数:"

echo ""
echo "=========================================="
echo "四、性能测试"
echo "=========================================="
echo ""

echo "API响应时间测试..."
echo ""

echo "1. 登录API:"
time curl -s -X POST http://127.0.0.1:3002/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' \
    -o /dev/null -w "   响应时间: %{time_total}s\n" 2>&1

echo ""
echo "2. Dashboard API:"
time curl -s http://127.0.0.1:3002/api/dashboard \
    -o /dev/null -w "   响应时间: %{time_total}s\n" 2>&1

echo ""
echo "3. 学员列表 API:"
time curl -s http://127.0.0.1:3002/api/students \
    -o /dev/null -w "   响应时间: %{time_total}s\n" 2>&1

echo ""
echo "=========================================="
echo "五、管理端功能测试"
echo "=========================================="
echo ""

echo "测试激活码生成..."
RESULT=$(curl -s -X POST http://127.0.0.1:3002/api/codes \
    -H "Content-Type: application/json" \
    -d '{"count":1,"version":"standard","expireDays":365}')
if echo "$RESULT" | grep -q "success.*true"; then
    echo "   ✅ 激活码生成正常"
else
    echo "   ❌ 激活码生成失败"
fi
echo ""

echo "测试学员详情..."
RESULT=$(curl -s http://127.0.0.1:3002/api/students/ou_59a71f8c62233d851385b132dcc8c09c)
if echo "$RESULT" | grep -q "userId"; then
    echo "   ✅ 学员详情正常"
else
    echo "   ❌ 学员详情异常"
fi
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="
