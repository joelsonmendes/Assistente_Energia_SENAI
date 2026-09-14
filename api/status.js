
export default function handler(req,res){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||'';
 const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
 res.status(200).json({configured:!!(url&&key),supabaseUrl:url,supabaseAnonKey:key});
}
