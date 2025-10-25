import 'dotenv/config'
"import postgress from 'postgress'

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
if (!conn) {
  console.log('NO_DB')
  process.exit(0)
}
const sql = postgress(conn, { prepare: false })
try {
  const a = await sql`q•±•Ð½Õ¹Ð ¨¤é¥¹Ð…Ì¸™É½´ÁÕ‰±¥Œ¹Á±…å•É}…¹…±åÑ¥Í€(€½¹ÍÐØ€ô…Ý…¥ÐÍÅ±Í•±•Ð½Õ¹Ð ¨¤ é¥¹Ð…Ì¸™É½´ÁÕ‰±¥Œ¹Ù}ÁÉ½ÁÍ}±¥ÍÑ€(€½¹Í½±”¹±½œ¡…¹…±åÑ¥Í}É½ÝÌô¬ì¹¹ô¥€°…lÁt¤(€½¹Í½±”¹±½œ¡Ù}ÁÉ½ÁÍ}±¥ÍÑ}É½ÝÌô‘ì¹¹õ€°ÙlÁt¤)ô…Ñ ¡”¤ì(€½¹Í½±”¹±½œ 	}IHèœ°”¹µ•ÍÍ…”ñð”¤)ô™¥¹…±±äì(€…Ý…¥ÐÍÅ°¹•¹¡ìÑ¥µ•½ÕÐè€Èô¤)ô(