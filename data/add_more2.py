import json

with open('questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

existing = set(q['content'] for q in data['questions'])

# 添加241-300题（最后60题）
new_questions = [
    {"id": "q241", "subjectId": "blood_quality", "type": "single", "difficulty": "medium", "content": "血站工作人员应", "options": [{"id": "A", "text": "每年体检1次"}, {"id": "B", "text": "每2年体检1次"}, {"id": "C", "text": "不需要体检"}, {"id": "D", "text": "每5年体检1次"}], "correctAnswer": "A", "explanation": "血站工作人员应每年体检1次，建立健康档案，患有传染病者不得从事血液工作。", "source": "基于教材生成"},
    {"id": "q242", "subjectId": "blood_quality", "type": "single", "difficulty": "hard", "content": "血站实验室人员应具备", "options": [{"id": "A", "text": "医学检验专业学历或培训合格"}, {"id": "B", "text": "高中学历"}, {"id": "C", "text": "不需要专业背景"}, {"id": "D", "text": "仅需要工作经验"}], "correctAnswer": "A", "explanation": "血站实验室人员应具备医学检验专业学历或经培训考核合格，持证上岗。", "source": "基于教材生成"},
    {"id": "q243", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "hard", "content": "新生儿换血治疗的适应证不包括", "options": [{"id": "A", "text": "严重溶血病"}, {"id": "B", "text": "胆红素脑病"}, {"id": "C", "text": "轻度黄疸"}, {"id": "D", "text": "血清胆红素快速上升"}], "correctAnswer": "C", "explanation": "轻度黄疸可通过光疗治疗，换血治疗适用于严重溶血病、胆红素脑病或血清胆红素快速上升者。", "source": "基于教材生成"},
    {"id": "q244", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "hard", "content": "新生儿换血的血量通常是患儿血容量的", "options": [{"id": "A", "text": "1倍"}, {"id": "B", "text": "1.5-2倍"}, {"id": "C", "text": "3倍"}, {"id": "D", "text": "5倍"}], "correctAnswer": "B", "explanation": "新生儿换血通常换血量为其血容量的1.5-2倍（约150-200ml/kg），可去除约85-90%的致敏红细胞和胆红素。", "source": "基于教材生成"},
    {"id": "q245", "subjectId": "blood_basic", "type": "single", "difficulty": "hard", "content": "Duffy血型系统的临床意义是", "options": [{"id": "A", "text": "与输血反应有关"}, {"id": "B", "text": "与新生儿溶血病有关"}, {"id": "C", "text": "与疟疾抗性有关"}, {"id": "D", "text": "以上都是"}], "correctAnswer": "D", "explanation": "Duffy血型与输血反应、新生儿溶血病有关，Fy(a-b-)表型对间日疟原虫有抗性。", "source": "基于教材生成"},
    {"id": "q246", "subjectId": "blood_basic", "type": "single", "difficulty": "hard", "content": "Kidd血型系统的特点是", "options": [{"id": "A", "text": "抗体多为IgM型"}, {"id": "B", "text": "抗体可引起严重迟发性溶血反应"}, {"id": "C", "text": "与疾病无关"}, {"id": "D", "text": "抗原性弱"}], "correctAnswer": "B", "explanation": "Kidd抗体（抗-Jka、抗-Jkb）多为IgG型，可引起严重的迟发性溶血输血反应。", "source": "基于教材生成"},
    {"id": "q247", "subjectId": "blood_test", "type": "single", "difficulty": "medium", "content": "交叉配血时，主侧凝集说明", "options": [{"id": "A", "text": "受血者血清中有抗供血者红细胞的抗体"}, {"id": "B", "text": "供血者血清中有抗受血者红细胞的抗体"}, {"id": "C", "text": "ABO血型相同"}, {"id": "D", "text": "可以输血"}], "correctAnswer": "A", "explanation": "主侧凝集说明受血者血清中有针对供血者红细胞的抗体，输血会发生溶血反应，不能输血。", "source": "基于教材生成"},
    {"id": "q248", "subjectId": "blood_test", "type": "single", "difficulty": "medium", "content": "交叉配血时，次侧凝集说明", "options": [{"id": "A", "text": "受血者血清中有抗体"}, {"id": "B", "text": "供血者血清中有抗受血者红细胞的抗体"}, {"id": "C", "text": "绝对不能输血"}, {"id": "D", "text": "无关紧要"}], "correctAnswer": "B", "explanation": "次侧凝集说明供血者血清中有抗受血者红细胞的抗体，但供血者血浆被受血者血液稀释，通常不引起严重反应，但应谨慎。", "source": "基于教材生成"},
    {"id": "q249", "subjectId": "blood_quality", "type": "single", "difficulty": "medium", "content": "血站对血液进行传染病检测，采用的方法是", "options": [{"id": "A", "text": "细菌培养"}, {"id": "B", "text": "ELISA和核酸检测"}, {"id": "C", "text": "血常规"}, {"id": "D", "text": "尿常规"}], "correctAnswer": "B", "explanation": "血站采用ELISA检测抗体/抗原，部分项目采用核酸检测(NAT)，提高检测灵敏度。", "source": "基于教材生成"},
    {"id": "q250", "subjectId": "blood_quality", "type": "single", "difficulty": "hard", "content": "核酸检测(NAT)的优势是", "options": [{"id": "A", "text": "成本低"}, {"id": "B", "text": "可缩短窗口期"}, {"id": "C", "text": "操作简单"}, {"id": "D", "text": "不需要设备"}], "correctAnswer": "B", "explanation": "NAT直接检测病毒核酸，可缩短窗口期，比抗体检测更早发现感染。", "source": "基于教材生成"},
    {"id": "q251", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "hard", "content": "肿瘤患者输血，应特别注意", "options": [{"id": "A", "text": "快速输血"}, {"id": "B", "text": "去白细胞输血可减少复发"}, {"id": "C", "text": "多输全血"}, {"id": "D", "text": "不需要特殊注意"}], "correctAnswer": "B", "explanation": "研究表明去白细胞输血可减少肿瘤患者术后感染和肿瘤复发，可能与减少免疫抑制有关。", "source": "基于教材生成"},
    {"id": "q252", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "hard", "content": "心脏手术患者输血，Hb维持目标通常为", "options": [{"id": "A", "text": ">70g/L"}, {"id": "B", "text": ">80g/L"}, {"id": "C", "text": ">90g/L"}, {"id": "D", "text": ">100g/L"}], "correctAnswer": "C", "explanation": "心脏手术患者Hb维持目标通常为>90g/L，以保证心肌氧供，减少并发症。", "source": "基于教材生成"},
    {"id": "q253", "subjectId": "transfusion_reaction", "type": "single", "difficulty": "hard", "content": "迟发性溶血性输血反应通常发生在输血后", "options": [{"id": "A", "text": "数分钟至数小时"}, {"id": "B", "text": "24小时内"}, {"id": "C", "text": "3-14天"}, {"id": "D", "text": "1个月后"}], "correctAnswer": "C", "explanation": "迟发性溶血反应通常发生在输血后3-14天，由回忆性免疫反应引起，症状较轻。", "source": "基于教材生成"},
    {"id": "q254", "subjectId": "transfusion_reaction", "type": "single", "difficulty": "hard", "content": "迟发性溶血性输血反应最常见的抗体是", "options": [{"id": "A", "text": "抗-A"}, {"id": "B", "text": "抗-B"}, {"id": "C", "text": "抗-Jka、抗-E等"}, {"id": "D", "text": "抗-D"}], "correctAnswer": "C", "explanation": "迟发性溶血反应多由Kidd、Rh等系统的抗体引起，这些抗体在初次免疫后水平下降，再次刺激后产生回忆反应。", "source": "基于教材生成"},
    {"id": "q255", "subjectId": "blood_quality", "type": "single", "difficulty": "medium", "content": "血站应建立血液报废制度，报废血液应", "options": [{"id": "A", "text": "直接丢弃"}, {"id": "B", "text": "记录原因并按规定处理"}, {"id": "C", "text": "卖给其他机构"}, {"id": "D", "text": "退回献血者"}], "correctAnswer": "B", "explanation": "报废血液应记录报废原因、数量、处理方式等，并按医疗废物管理规定处理。", "source": "基于教材生成"},
    {"id": "q256", "subjectId": "blood_quality", "type": "single", "difficulty": "hard", "content": "血液报废的常见原因不包括", "options": [{"id": "A", "text": "检测不合格"}, {"id": "B", "text": "过期"}, {"id": "C", "text": "外观异常"}, {"id": "D", "text": "献血者要求"}], "correctAnswer": "D", "explanation": "血液报废原因包括检测不合格、过期、外观异常、破损等，献血者要求不是报废原因。", "source": "基于教材生成"},
    {"id": "q257", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "medium", "content": "术前自体储血适用于", "options": [{"id": "A", "text": "急诊手术"}, {"id": "B", "text": "择期手术且预计出血量大"}, {"id": "C", "text": "严重贫血患者"}, {"id": "D", "text": "感染患者"}], "correctAnswer": "B", "explanation": "术前自体储血适用于择期手术、预计出血量大、稀有血型或有多种抗体的患者。", "source": "基于教材生成"},
    {"id": "q258", "subjectId": "clinical_transfusion", "type": "single", "difficulty": "hard", "content": "术前自体储血，每次采血间隔至少", "options": [{"id": "A", "text": "1天"}, {"id": "B", "text": "3天"}, {"id": "C", "text": "7天"}, {"id": "D", "text": "14天"}], "correctAnswer": "B", "explanation": "术前自体储血每次采血间隔至少3天，最后一次采血应在术前3天进行，以保证患者恢复。", "source": "基于教材生成"},
    {"id": "q259", "subjectId": "blood_basic", "type": "single", "difficulty": "hard", "content": "Lewis血型系统的特点是", "options": [{"id": "A", "text": "与ABO系统无关"}, {"id": "B", "text": "Le(a+b+)是常见表型"}, {"id": "C", "text": "分泌型人群多为Le(a-b+)"}, {"id": "D", "text": "与疾病无关"}], "correctAnswer": "C", "explanation": "分泌型人群多为Le(a-b+)，非分泌型多为Le(a+b-)，Lewis抗原与ABO系统相关。", "source": "基于教材生成"},
    {"id": "q260", "subjectId": "blood_basic", "type": "single", "difficulty": "hard", "content": "MNSs血型系统的临床意义是", "options": [{"id": "A", "text": "与输血反应无关"}, {"id": "B", "text": "抗-M、抗-N可引起溶血反应"}, {"id": "C", "text": "与新生儿溶血病无关"}, {"id": "D", "text": "抗原性弱"}], "correctAnswer": "B", "explanation": "MNSs系统抗体（抗-M、抗-N、抗-S、抗-s）可引起溶血输血反应和新生儿溶血病。", "source": "基于教材生成"},
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
