import 'dotenv/config'
"import postgress from 'postgress'

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
if (!conn) {
  console.log('NO_DB')
  process.exit(0)
}
const sql = postgress(conn, { prepare: false })
try {
  const a = await sql`q����Ё��չР��饹Ё�́���ɽ���Չ���������}�����ѥ�̀(������Ё؀�݅�Ё�ű�͕���Ё��չР���饹Ё�́���ɽ���Չ�����}�ɽ��}���р(�����ͽ�������������ѥ��}ɽ������칹������l�t�(�����ͽ���������}�ɽ��}����}ɽ����칹�����l�t�)􁍅э������(�����ͽ��������	}IH蜰������ͅ��������)􁙥������(���݅�Ё�Ű������ѥ������ȁ��)�(