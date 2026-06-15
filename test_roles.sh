#!/bin/bash
BASE="http://localhost:8001/api"

login() {
  curl -s -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"employee_no\":\"$1\",\"password\":\"$2\"}"
}

api() {
  local method=$1 path=$2 token=$3
  shift 3
  curl -s -w "\nHTTP:%{http_code}" -X "$method" "$BASE$path" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    "$@"
}

echo "========== 登录测试 =========="
for acc in "HR001:hr" "TECH001:manager" "TECH002:employee"; do
  no=${acc%%:*}
  role=${acc##*:}
  resp=$(login "$no" "123456")
  token=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
  if [ -z "$token" ]; then
    echo "FAIL login $no: $resp"
  else
    echo "OK login $no ($role)"
    eval "TOKEN_${no}='$token'"
  fi
done

HR=$(login HR001 123456 | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
MGR=$(login TECH001 123456 | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
EMP=$(login TECH002 123456 | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo ""
echo "========== 权限边界：员工列表 =========="
for label in "HR:$HR" "主管:$MGR" "员工:$EMP"; do
  name=${label%%:*}; t=${label#*:}
  r=$(api GET "/employees?page=1&pageSize=3" "$t")
  code=$(echo "$r" | tail -1 | cut -d: -f2)
  body=$(echo "$r" | sed '$d')
  has_pwd=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print('password' in d.get('list',[{}])[0])" 2>/dev/null)
  echo "$name GET /employees => HTTP $code, 返回password字段: $has_pwd"
done

echo ""
echo "========== 权限边界：普通员工越权 =========="
r=$(api GET "/employees" "$EMP"); echo "员工 GET /employees => $(echo "$r"|tail -1)"
r=$(api POST "/employees" "$EMP" -d '{"employee_no":"X001","name":"测试"}'); echo "员工 POST /employees => $(echo "$r"|tail -1)"
r=$(api GET "/reports/department-attendance-rate" "$EMP"); echo "员工 GET 报表 => $(echo "$r"|tail -1)"
r=$(api GET "/attendance/department-summary" "$EMP"); echo "员工 GET 部门考勤 => $(echo "$r"|tail -1)"
r=$(api GET "/leave/pending" "$EMP"); echo "员工 GET 待审批 => $(echo "$r"|tail -1) (应空列表非403)"

echo ""
echo "========== 权限边界：主管 vs HR =========="
r=$(api DELETE "/employees/99" "$MGR"); echo "主管 DELETE 员工 => $(echo "$r"|tail -1) (应403)"
r=$(api GET "/departments" "$MGR"); echo "主管 GET 部门管理 => $(echo "$r"|tail -1)"

echo ""
echo "========== 员工详情泄露密码 =========="
r=$(api GET "/employees/3" "$HR")
echo "$r" | sed '$d' | python3 -c "import sys,json; d=json.load(sys.stdin); print('详情含password:', 'password' in d, '字段:', list(d.keys())[:8])"

echo ""
echo "========== 请假全流程 TECH002 =========="
# 提交事假
r=$(api POST "/leave" "$EMP" -d '{"leave_type":"personal","start_date":"2026-06-16","end_date":"2026-06-16","reason":"测试请假"}')
echo "提交请假 => $(echo "$r"|tail -1)"
leave_id=$(echo "$r" | sed '$d' | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
echo "leave_id=$leave_id"

r=$(api GET "/leave/pending" "$MGR")
pending_mgr=$(echo "$r" | sed '$d' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('total',0))" 2>/dev/null)
echo "主管待审批数量: $pending_mgr"

if [ -n "$leave_id" ]; then
  r=$(api POST "/leave/$leave_id/approve" "$MGR")
  echo "主管审批 => $(echo "$r"|sed '$d')"
  echo "主管审批 HTTP => $(echo "$r"|tail -1)"
  
  r=$(api GET "/leave/pending" "$HR")
  pending_hr=$(echo "$r" | sed '$d' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('total',0))" 2>/dev/null)
  echo "HR待审批数量: $pending_hr"
  
  r=$(api POST "/leave/$leave_id/approve" "$HR")
  echo "HR审批 => $(echo "$r"|sed '$d')"
  echo "HR审批 HTTP => $(echo "$r"|tail -1)"
  
  r=$(api GET "/attendance/today" "$EMP")
  echo "审批后今日考勤 => $(echo "$r"|sed '$d')"
fi

echo ""
echo "========== 打卡测试（工作日） =========="
r=$(api POST "/attendance/clock-in" "$EMP")
echo "上班打卡 => $(echo "$r"|sed '$d') $(echo "$r"|tail -1)"
r=$(api POST "/attendance/clock-out" "$EMP")
echo "下班打卡 => $(echo "$r"|sed '$d') $(echo "$r"|tail -1)"
r=$(api POST "/attendance/clock-in" "$EMP")
echo "重复上班打卡 => $(echo "$r"|sed '$d') $(echo "$r"|tail -1)"

echo ""
echo "========== 离职联动 =========="
# 先把 TECH002 标离职
tech2_id=$(api GET "/employees?page=1&pageSize=20" "$HR" | sed '$d' | python3 -c "import sys,json; [print(e['id']) for e in json.load(sys.stdin)['list'] if e['employee_no']=='TECH002']" 2>/dev/null)
if [ -n "$tech2_id" ]; then
  r=$(api PUT "/employees/$tech2_id" "$HR" -d '{"status":"resigned"}')
  echo "标记离职 => $(echo "$r"|tail -1)"
  r=$(api POST "/attendance/clock-in" "$EMP")
  echo "离职后打卡 => $(echo "$r"|sed '$d') $(echo "$r"|tail -1)"
  r=$(api POST "/leave" "$EMP" -d '{"leave_type":"personal","start_date":"2026-06-20","end_date":"2026-06-20","reason":"离职后请假"}')
  echo "离职后请假 => $(echo "$r"|sed '$d') $(echo "$r"|tail -1)"
  # 恢复
  api PUT "/employees/$tech2_id" "$HR" -d '{"status":"active"}' >/dev/null
fi

echo ""
echo "========== 报表与导出 =========="
r=$(api GET "/reports/department-attendance-rate?month=2024-06" "$HR")
echo "部门考勤率 => $(echo "$r"|tail -1)"
r=$(api GET "/reports/leave-type-statistics?month=2024-06" "$HR")
echo "请假统计 => $(echo "$r"|sed '$d' | head -c 200) $(echo "$r"|tail -1)"
r=$(curl -s -w "\nHTTP:%{http_code}" -H "Authorization: Bearer $HR" "$BASE/reports/export/department-attendance?month=2024-06" -o /tmp/att.xlsx)
echo "Excel导出 => $(echo "$r"|tail -1), size=$(wc -c </tmp/att.xlsx 2>/dev/null || echo 0)"

echo ""
echo "========== 主管只能看本部门？ =========="
r=$(api GET "/attendance/department-summary?month=2024-06&department_id=4" "$MGR")
count=$(echo "$r" | sed '$d' | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('list',[])))" 2>/dev/null)
echo "主管查财务部(4)考勤 => 返回${count}条 $(echo "$r"|tail -1) (应限制?)"

echo ""
echo "========== 请假详情无权限校验 =========="
r=$(api GET "/leave/1" "$EMP")
echo "员工查他人请假详情 => $(echo "$r"|sed '$d' | head -c 150) $(echo "$r"|tail -1)"

echo ""
echo "========== 年假规则 =========="
r=$(api POST "/leave" "$EMP" -d '{"leave_type":"annual","start_date":"2026-06-23","end_date":"2026-06-27","reason":"年假测试"}')
echo "超额年假 => $(echo "$r"|sed '$d') $(echo "$r"|tail -1)"
