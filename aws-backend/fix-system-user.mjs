import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 环境变量检查:');
console.log('SUPABASE_URL:', supabaseUrl ? '已设置' : '未设置');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '已设置' : '未设置');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixSystemUser() {
  console.log('\n🔍 检查系统用户...\n');

  // 检查auth.users表中的用户
  try {
    console.log('📋 检查auth.users表...');
    
    // 使用SQL查询auth.users表
    const { data: users, error } = await supabase
      .from('auth.users')
      .select('id, email, created_at')
      .limit(5);

    if (error) {
      console.log('❌ 查询auth.users失败:', error.message);
      console.log('💡 尝试使用RPC查询...');
      
      // 尝试使用RPC查询
      const { data: rpcUsers, error: rpcError } = await supabase
        .rpc('get_users', {})
        .limit(5);

      if (rpcError) {
        console.log('❌ RPC查询也失败:', rpcError.message);
      } else {
        console.log('✅ RPC查询成功，用户数量:', rpcUsers?.length || 0);
        if (rpcUsers && rpcUsers.length > 0) {
          console.log('📝 第一个用户:', rpcUsers[0]);
        }
      }
    } else {
      console.log('✅ 查询auth.users成功，用户数量:', users?.length || 0);
      if (users && users.length > 0) {
        console.log('📝 用户列表:');
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email || 'N/A'}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ 查询异常:', error.message);
  }

  // 检查users表（如果存在）
  try {
    console.log('\n📋 检查users表...');
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, created_at')
      .limit(5);

    if (error) {
      console.log('❌ 查询users表失败:', error.message);
    } else {
      console.log('✅ 查询users表成功，用户数量:', users?.length || 0);
      if (users && users.length > 0) {
        console.log('📝 用户列表:');
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email || 'N/A'}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ 查询异常:', error.message);
  }

  // 尝试创建系统用户
  try {
    console.log('\n📋 尝试创建系统用户...');
    
    const systemUserId = '00000000-0000-0000-0000-000000000000';
    
    // 尝试在users表中插入系统用户
    const { data: insertResult, error: insertError } = await supabase
      .from('users')
      .insert({
        id: systemUserId,
        email: 'system@productmind.ai',
        name: 'System User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, email')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        console.log('✅ 系统用户已存在');
      } else {
        console.log('❌ 创建系统用户失败:', insertError.message);
      }
    } else {
      console.log('✅ 系统用户创建成功:', insertResult);
    }
  } catch (error) {
    console.log('❌ 创建系统用户异常:', error.message);
  }

  // 检查template_versions表的外键约束
  try {
    console.log('\n📋 检查template_versions表结构...');
    
    const { data: versions, error } = await supabase
      .from('template_versions')
      .select('id, created_by, created_at')
      .limit(1);

    if (error) {
      console.log('❌ 查询template_versions失败:', error.message);
    } else {
      console.log('✅ template_versions表查询成功');
      if (versions && versions.length > 0) {
        console.log('📝 示例记录:', versions[0]);
      }
    }
  } catch (error) {
    console.log('❌ 查询异常:', error.message);
  }

  // 提供解决方案
  console.log('\n💡 解决方案建议:');
  console.log('1. 使用现有的真实用户ID作为created_by');
  console.log('2. 修改外键约束，允许NULL值');
  console.log('3. 在auth.users表中创建系统用户');
  console.log('4. 使用service role权限绕过外键检查');
}

// 执行检查
checkAndFixSystemUser().catch(console.error); 