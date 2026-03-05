import json

with open('questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

existing = set(q['content'] for q in data['questions'])

# 最后16题，达到300题
final_questions = [
    {"id": "q285", "subjectId": "blood_basic", "type": "single", "difficulty": "hard", "content": "Xg血型系统的抗原是", "options": [{"id": "A", "text": "Xga和Xgb"}, {"id": "B", "text": "仅Xga"}, {"id": "C", "text": "仅Xgb"}, {"id": "D", "text": "以上都不是"}], "correctAnswer": "B", "explanation": "Xg血型系统只有一个抗原Xga，是X连锁遗传，抗体罕见。", "source": "基于教材生成"},
    {"id": "q286", "subjectId": "blood_basic", "type": "single", "difficulty": "hard", "content": "Gerbich血型系统的抗原主要位于", "options": [{"id": "A", "text": "红细胞膜糖蛋白C和D上"}, {"id": "B", "text": "ABO抗原上"}, {"id": "C", "text": "Rh抗原上"}, {"id": "D", "text": "H抗原上"}], "correctAnswer": "A", "explanation": "Gerbich抗原位于红细胞膜糖蛋白C和D上，抗体可引起溶血反应。", "source": "基于教材生成"},
    {"id": "q287", "subjectId": "blood_test", "type": "single", "difficulty": "hard", "content": "固相吸附试验用于", "options": [{"id": "A", "text": "检测血小板抗体"}, {"id": "B", "text": "检测红细胞抗原"}, {"id": "C", "text": "检测白细胞抗体"}, {"id": "D", "text": "以上都是"}], "correctAnswer": "A", "explanation": "固相吸附试验主要用于检测血小板抗体，是血小板配型的常用方法。", "source": "基于教材生成"},
    {"id": "q288", "subjectId": "blood_test", "type": "single", "difficulty": "hard", "content": "单克隆抗体特异性血小板抗原固定试验(MAIPA)用于", "options": [{"id": "A", "text": "检测血小板糖蛋白特异性抗体"}, {"id": "B", "text": "检测ABO抗体"}, {"id": "C", "text": "检测Rh抗体"}, {"id": "D", "text": "检测HLA抗体"}], "correctAnswer": "A", "explanation": "MAIPA是检测血小板糖蛋白特异性抗体的金标准方法，用于诊断免疫性血小板减少症。", "source": "基于教材生成"},
    {"id": "q289", "subjectId": "blood_quality", "type": "single", "difficulty": "medium", "content": "血站对献血者进行献血前告知，内容应包括", "options": [{"id": "A", "text": "献血的意义、献血过程、可能的不良反应、注意事项"}, {"id": "B", "text": "仅告知献血意义"}, {"id": "C", "text": "不需要告知"}, {"id": "D", "text": "仅告知注意事项"}], "correctAnswer": "A", "explanation": "献血前告知应包括献血的意义、献血过程、可能的不良反应、注意事项、献血者健康征询表内容等。", "source": "基于教材生成"},
    {"id": "q290", "subjectId": "blood_quality", "type": "single", "difficulty": "hard", "content": "献血者隐私保护包括", "options": [{"id": "A", "text": "献血者个人信息、血液检测结果、献血记录等保密"}, {"id": "B", "text": "仅保护姓名"}, {"id": "C", "text": "不需要保护"}, {"id": "D", "text": "仅保护血型"}], "correctAnswer": "A", "explanation": "献血者隐私保护包括个人信息、血液检测结果、献血记录等，未经本人同意不得向第三方透露。", "source": "基于教材生成"},
    {"id": "q291", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "hard", "content": "Evans综合征的特点是", "options": [{"id": "A", "text": "自身免疫性溶血性贫血合并免疫性血小板减少"}, {"id": "B", "text": "仅溶血性贫血"}, {"id": "C", "text": "仅血小板减少"}, {"id": "D", "text": "与输血无关"}], "correctAnswer": "A", "explanation": "Evans综合征是自身免疫性溶血性贫血合并免疫性血小板减少，输血应谨慎，选择洗涤红细胞。", "source": "基于教材生成"},
    {"id": "q292", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "hard", "content": "再生障碍性贫血患者输血，应", "options": [{"id": "A", "text": "尽量减少输血，避免铁过载"}, {"id": "B", "text": "大量输血"}, {"id": "C", "text": "仅输血浆"}, {"id": "D", "text": "不需要输血"}], "correctAnswer": "A", "explanation": "再障患者应尽量减少输血，延缓铁过载发生，为造血干细胞移植创造条件。", "source": "基于教材生成"},
    {"id": "q293", "subjectId": "transfusion_reaction", "type": "single", "difficulty": "hard", "content": "输血传播CMV感染的高危人群是", "options": [{"id": "A", "text": "免疫缺陷患者、早产儿、孕妇"}, {"id": "B", "text": "健康成人"}, {"id": "C", "text": "CMV阳性者"}, {"id": "D", "text": "以上都不是"}], "correctAnswer": "A", "explanation": "免疫缺陷患者、早产儿、孕妇是CMV感染高危人群，应输注CMV阴性血或去白细胞血。", "source": "基于教材生成"},
    {"id": "q294", "subjectId": "transfusion_reaction", "type": "single", "difficulty": "medium", "content": "预防输血传播HTLV的措施是", "options": [{"id": "A", "text": "去白细胞输血"}, {"id": "B", "text": "辐照"}, {"id": "C", "text": "冰冻"}, {"id": "D", "text": "不需要预防"}], "correctAnswer": "A", "explanation": "HTLV主要存在于白细胞中，去白细胞输血可有效预防输血传播HTLV。", "source": "基于教材生成"},
    {"id": "q295", "subjectId": "blood_quality", "type": "single", "difficulty": "hard", "content": "血液成分制备时，白细胞滤除的最佳时间是", "options": [{"id": "A", "text": "采血后即刻"}, {"id": "B", "text": "采血后24-48小时"}, {"id": "C", "text": "储存期末"}, {"id": "D", "text": "输注前"}], "correctAnswer": "B", "explanation": "白细胞滤除最佳时间是采血后24-48小时，此时白细胞尚未释放细胞因子，滤除效果好。", "source": "基于教材生成"},
    {"id": "q296", "subjectId": "blood_quality", "type": "single", "difficulty": "hard", "content": "血液成分制备时，白细胞滤除对红细胞的影响是", "options": [{"id": "A", "text": "无影响"}, {"id": "B", "text": "轻微损伤，保存期缩短为42天"}, {"id": "C", "text": "严重损伤"}, {"id": "D", "text": "增强红细胞功能"}], "correctAnswer": "B", "explanation": "白细胞滤除对红细胞有轻微损伤，去白细胞红细胞保存期为42天（原35-42天）。", "source": "基于教材生成"},
    {"id": "q297", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "hard", "content": "新生儿坏死性小肠结肠炎(NEC)患者输血，应注意", "options": [{"id": "A", "text": "输注速度过快可能诱发或加重NEC"}, {"id": "B", "text": "快速大量输血"}, {"id": "C", "text": "不需要特别注意"}, {"id": "D", "text": "仅输血浆"}], "correctAnswer": "A", "explanation": "NEC患儿输血速度过快可能诱发或加重NEC，应缓慢输注，并密切观察。", "source": "基于教材生成"},
    {"id": "q298", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "hard", "content": "胎儿宫内输血，输注部位通常是", "options": [{"id": "A", "text": "胎儿腹腔或脐静脉"}, {"id": "B", "text": "母体静脉"}, {"id": "C", "text": "羊膜腔"}, {"id": "D", "text": "胎儿心脏"}], "correctAnswer": "A", "explanation": "胎儿宫内输血通常经胎儿腹腔（腹腔内输血）或脐静脉（脐带穿刺）输注。", "source": "基于教材生成"},
    {"id": "q299", "subjectId": "blood_basic", "type": "single", "difficulty": "hard", "content": "Cromer血型系统的抗原位于", "options": [{"id": "A", "text": "补体调节蛋白CD55上"}, {"id": "B", "text": "ABO抗原上"}, {"id": "C", "text": "Rh抗原上"}, {"id": "D", "text": "H抗原上"}], "correctAnswer": "A", "explanation": "Cromer抗原位于补体调节蛋白CD55（DAF，衰变加速因子）上，抗体可引起溶血反应。", "source": "基于教材生成"},
    {"id": "q300", "subjectId": "blood_basic", "type": "single", "difficulty": "hard", "content": "Knops血型系统的抗原位于", "options": [{"id": "A", "text": "补体受体1(CR1，CD35)上"}, {"id": "B", "text": "ABO抗原上"}, {"id": "C", "text": "Rh抗原上"}, {"id": "D", "text": "H抗原上"}], "correctAnswer": "A", "explanation": "Knops抗原位于补体受体1(CR1，CD35)上，抗体可引起溶血反应，临床意义相对较小。", "source": "基于教材生成"},
]

added = 0
for q in final_questions:
    if q['content'] not in existing:
        data['questions'].append(q)
        existing.add(q['content'])
        added += 1

data['metadata']['totalQuestions'] = len(data['questions'])

with open('questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"🎉 Added {added} final questions!")
print(f"📊 Total: {len(data['questions'])} questions!")
if len(data['questions']) >= 300:
    print("✅🎊 CONGRATULATIONS! Target 300 REACHED! 🎊✅")
else:
    print(f"📝 Still need {300 - len(data['questions'])} more")
