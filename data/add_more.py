import json

with open('questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

existing = set(q['content'] for q in data['questions'])
start_id = len(data['questions']) + 1

# 添加233-260题
new_questions = [
    {"id": "q233", "subjectId": "blood_test", "type": "single", "difficulty": "hard", "content": "放散试验的原理是", "options": [{"id": "A", "text": "将抗原从红细胞上洗脱"}, {"id": "B", "text": "将抗体从红细胞上洗脱"}, {"id": "C", "text": "破坏红细胞"}, {"id": "D", "text": "凝集红细胞"}], "correctAnswer": "B", "explanation": "放散试验通过改变温度或pH等条件，将结合在红细胞上的抗体洗脱下来。", "source": "基于教材生成"},
    {"id": "q234", "subjectId": "blood_test", "type": "single", "difficulty": "hard", "content": "热放散试验常用的温度是", "options": [{"id": "A", "text": "4°C"}, {"id": "B", "text": "37°C"}, {"id": "C", "text": "56°C"}, {"id": "D", "text": "100°C"}], "correctAnswer": "C", "explanation": "热放散试验通常在56°C进行，加热可使抗体从红细胞上解离。", "source": "基于教材生成"},
    {"id": "q235", "subjectId": "blood_quality", "type": "single", "difficulty": "medium", "content": "血液储存冰箱的温度应保持在", "options": [{"id": "A", "text": "0-2°C"}, {"id": "B", "text": "2-6°C"}, {"id": "C", "text": "10-15°C"}, {"id": "D", "text": "20-24°C"}], "correctAnswer": "B", "explanation": "红细胞储存冰箱温度应保持在2-6°C，并24小时监控。", "source": "基于教材生成"},
    {"id": "q236", "subjectId": "blood_quality", "type": "single", "difficulty": "hard", "content": "血液储存冰箱的温度记录应", "options": [{"id": "A", "text": "每天记录1次"}, {"id": "B", "text": "每天记录2次"}, {"id": "C", "text": "连续自动记录"}, {"id": "D", "text": "不需要记录"}], "correctAnswer": "C", "explanation": "血液储存冰箱应配备温度自动记录仪，24小时连续监测和记录。", "source": "基于教材生成"},
    {"id": "q237", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "medium", "content": "输血器应", "options": [{"id": "A", "text": "每输1单位更换"}, {"id": "B", "text": "每4小时或每输4单位更换"}, {"id": "C", "text": "每天更换1次"}, {"id": "D", "text": "不需要更换"}], "correctAnswer": "B", "explanation": "输血器应每4小时或每输注4单位血液更换一次，防止细菌滋生。", "source": "基于教材生成"},
    {"id": "q238", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "hard", "content": "输血时不能加入的药物是", "options": [{"id": "A", "text": "生理盐水"}, {"id": "B", "text": "葡萄糖溶液"}, {"id": "C", "text": "林格液"}, {"id": "D", "text": "以上都不能加"}], "correctAnswer": "D", "explanation": "除生理盐水外，任何药物或溶液都不能加入血液中，以防溶血或凝血。", "source": "基于教材生成"},
    {"id": "q239", "subjectId": "transfusion_reaction", "type": "single", "difficulty": "hard", "content": "输血后紫癜的治疗首选", "options": [{"id": "A", "text": "输注血小板"}, {"id": "B", "text": "静脉注射免疫球蛋白(IVIG)"}, {"id": "C", "text": "糖皮质激素"}, {"id": "D", "text": "血浆置换"}], "correctAnswer": "B", "explanation": "输血后紫癜首选IVIG治疗，可抑制抗体产生，血小板输注效果差。", "source": "基于教材生成"},
    {"id": "q240", "subjectId": "transfusion_reaction", "type": "single", "difficulty": "hard", "content": "输血后紫癜患者血小板减少的原因是", "options": [{"id": "A", "text": "产生抗-HPA抗体"}, {"id": "B", "text": "产生抗-HLA抗体"}, {"id": "C", "text": "产生抗-ABO抗体"}, {"id": "D", "text": "产生抗-Rh抗体"}], "correctAnswer": "A", "explanation": "输血后紫癜多由抗-HPA-1a抗体引起，破坏自身和输注的血小板。", "source": "基于教材生成"},
]

added = 0
for q in new_questions:
    if q['content'] not in existing:
        data['questions'].append(q)
        existing.add(q['content'])
        added += 1

data['metadata']['totalQuestions'] = len(data['questions'])

with open('questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Added {added} questions, total: {len(data['questions'])}")
