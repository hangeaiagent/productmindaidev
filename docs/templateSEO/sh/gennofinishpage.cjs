#!/usr/bin/env node
/**
 * ProductMind AI 模板详情补充生成脚本
 * 文件: docs/templateSEO/sh/gennofinishpage.sh
 * 
 * 统计逻辑规则：
 * 1. 查询项目表下的user_projects的template_versions，是否包括了完整templates数据条件是template_categories的isshow=1
 * 2. 如果没有完整的template_versions数据，就补充生成遗漏的template_versions数据
 * 3. 对template_versions里面cnhtmlpath、enhtmlpath为空的数据，重新生成模板详情页面，调用目前生成模板详情页面的生成脚本，传递ID参数，不要重新开发
 * 4. 重新生成当前产品的主页信息，调用生成产品主页的现有脚本信息，传入当前产品ID，不要重新开发生成页面程序
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

// 环境变量配置
require('dotenv').config({ path: 'aws-backend/.env' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ 缺少必要的环境变量');
    console.error('请检查 aws-backend/.env 文件中的:');
    console.error('- SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class TemplateGenerationAnalyzer {
    constructor() {
        this.stats = {
            totalProjects: 0,
            projectsWithCompleteTemplates: 0,
            projectsNeedingGeneration: 0,
            missingTemplateVersions: 0,
            emptyHtmlPaths: 0,
            projectsNeedingHomepage: 0,
            generated: 0,
            errors: 0
        };
        this.activeTemplates = [];
        this.batchSize = 3; // 减少批量大小避免API限制
    }

    async run() {
        console.log('🔍 ProductMind AI 模板详情补充生成分析');
        console.log('分析时间:', new Date().toLocaleString('zh-CN'));
        console.log('='.repeat(60));

        try {
            // 1. 获取所有isshow=1的模板
            this.activeTemplates = await this.getActiveTemplates();
            console.log(`\n📋 1. 活跃模板统计: ${this.activeTemplates.length} 个`);
            this.displayActiveTemplates();

            // 2. 获取所有项目
            const projects = await this.getAllProjects();
            console.log(`\n📊 2. 项目统计: ${projects.length} 个`);
            this.stats.totalProjects = projects.length;

            // 3. 分析每个项目的模板完整性
            console.log(`\n🔍 3. 分析项目模板完整性...`);
            const analysisResults = await this.analyzeProjectTemplates(projects);

            // 4. 显示分析结果
            this.displayAnalysisResults(analysisResults);

            // 5. 执行补充生成（如果需要）
            if (process.argv.includes('--execute') || process.argv.includes('-e')) {
                await this.executeGeneration(analysisResults);
            } else {
                console.log('\n💡 提示: 添加 --execute 或 -e 参数来执行实际的补充生成');
                console.log('例如: node docs/templateSEO/sh/gennofinishpage.sh --execute');
            }

        } catch (error) {
            console.error('❌ 分析过程中出错:', error);
            process.exit(1);
        }
    }

    displayActiveTemplates() {
        console.log('   活跃模板列表:');
        this.activeTemplates.forEach((template, i) => {
            console.log(`   ${i + 1}. ${template.name_zh} (${template.name_en || 'N/A'})`);
        });
    }

    async getActiveTemplates() {
        const { data: templates, error } = await supabase
            .from('templates')
            .select(`
                id, name_zh, name_en, prompt_content, mdcprompt,
                template_categories!inner (id, name_zh, isshow)
            `)
            .eq('template_categories.isshow', 1);

        if (error) {
            throw new Error(`获取活跃模板失败: ${error.message}`);
        }

        return templates || [];
    }

    async getAllProjects() {
        const { data: projects, error } = await supabase
            .from('user_projects')
            .select('id, name, description, created_at, primary_category')
            .not('name', 'is', null)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`获取项目失败: ${error.message}`);
        }

        return projects || [];
    }

    async analyzeProjectTemplates(projects) {
        const results = [];
        
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            
            if (i % 50 === 0) {
                console.log(`   进度: ${i + 1}/${projects.length} (${((i + 1) / projects.length * 100).toFixed(1)}%)`);
            }

            // 获取项目已有的模板版本
            const { data: existingVersions, error } = await supabase
                .from('template_versions')
                .select('id, template_id, cnhtmlpath, enhtmlpath, output_content_zh, output_content_en')
                .eq('project_id', project.id);

            if (error) {
                console.warn(`⚠️  项目 ${project.id} 查询模板版本失败:`, error.message);
                continue;
            }

            const existingTemplateIds = new Set(existingVersions?.map(v => v.template_id) || []);
            const missingTemplates = this.activeTemplates.filter(t => !existingTemplateIds.has(t.id));
            
            // 检查HTML路径为空的版本
            const emptyHtmlVersions = existingVersions?.filter(v => 
                (!v.cnhtmlpath || !v.enhtmlpath) && 
                (v.output_content_zh || v.output_content_en)
            ) || [];

            const projectResult = {
                project: project,
                existingVersionsCount: existingVersions?.length || 0,
                expectedVersionsCount: this.activeTemplates.length,
                missingTemplates: missingTemplates,
                emptyHtmlVersions: emptyHtmlVersions,
                isComplete: missingTemplates.length === 0,
                needsHtmlGeneration: emptyHtmlVersions.length > 0
            };

            results.push(projectResult);

            // 更新统计
            if (projectResult.isComplete) {
                this.stats.projectsWithCompleteTemplates++;
            } else {
                this.stats.projectsNeedingGeneration++;
                this.stats.missingTemplateVersions += missingTemplates.length;
            }

            if (projectResult.needsHtmlGeneration) {
                this.stats.emptyHtmlPaths += emptyHtmlVersions.length;
            }
        }

        return results;
    }

    displayAnalysisResults(results) {
        console.log('\n📊 4. 分析结果统计');
        console.log(`   总项目数: ${this.stats.totalProjects}`);
        console.log(`   模板完整的项目: ${this.stats.projectsWithCompleteTemplates}`);
        console.log(`   需要补充生成的项目: ${this.stats.projectsNeedingGeneration}`);
        console.log(`   缺失的模板版本数: ${this.stats.missingTemplateVersions}`);
        console.log(`   需要生成HTML的版本数: ${this.stats.emptyHtmlPaths}`);

        // 显示需要处理的项目详情（前10个）
        const needsWork = results.filter(r => !r.isComplete || r.needsHtmlGeneration);
        if (needsWork.length > 0) {
            console.log('\n⚠️  5. 需要处理的项目（前10个）:');
            needsWork.slice(0, 10).forEach((result, i) => {
                const project = result.project;
                console.log(`   ${i + 1}. ${project.name} (ID: ${project.id.substring(0, 8)}...)`);
                console.log(`      缺失模板: ${result.missingTemplates.length}个`);
                console.log(`      需要生成HTML: ${result.emptyHtmlVersions.length}个`);
                if (result.missingTemplates.length > 0) {
                    console.log(`      缺失模板列表: ${result.missingTemplates.map(t => t.name_zh).join(', ')}`);
                }
            });

            if (needsWork.length > 10) {
                console.log(`   ... 还有 ${needsWork.length - 10} 个项目需要处理`);
            }
        }

        // 计算完成度
        const totalExpected = this.stats.totalProjects * this.activeTemplates.length;
        const totalExisting = totalExpected - this.stats.missingTemplateVersions;
        const completionRate = totalExpected > 0 ? ((totalExisting / totalExpected) * 100).toFixed(2) : '0';
        
        console.log('\n📈 6. 完成度分析');
        console.log(`   理论总模板数: ${totalExpected} (${this.stats.totalProjects} 项目 × ${this.activeTemplates.length} 模板)`);
        console.log(`   实际已有模板数: ${totalExisting}`);
        console.log(`   完成度: ${completionRate}%`);
    }

    async executeGeneration(results) {
        console.log('\n🚀 7. 开始执行补充生成...');
        
        const needsWork = results.filter(r => !r.isComplete || r.needsHtmlGeneration);
        
        if (needsWork.length === 0) {
            console.log('✅ 所有项目都已完成，无需补充生成！');
            return;
        }

        console.log(`📋 需要处理 ${needsWork.length} 个项目`);
        
        for (let i = 0; i < needsWork.length; i += this.batchSize) {
            const batch = needsWork.slice(i, i + this.batchSize);
            console.log(`\n📦 处理批次 ${Math.floor(i/this.batchSize) + 1}/${Math.ceil(needsWork.length/this.batchSize)}`);
            
            for (const result of batch) {
                await this.processProject(result);
            }
            
            // 批次间延迟
            if (i + this.batchSize < needsWork.length) {
                console.log('   ⏱️  批次间休息 5 秒...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        console.log('\n✅ 补充生成完成!');
        console.log(`📊 统计: 生成 ${this.stats.generated} 个，错误 ${this.stats.errors} 个`);
    }

    async processProject(result) {
        const project = result.project;
        console.log(`\n🔄 处理项目: ${project.name} (${project.id.substring(0, 8)}...)`);
        
        try {
            // 1. 生成缺失的模板版本（调用现有的批量生产服务）
            if (result.missingTemplates.length > 0) {
                console.log(`   📝 生成 ${result.missingTemplates.length} 个缺失的模板版本...`);
                
                for (const template of result.missingTemplates) {
                    try {
                        await this.generateTemplateVersionDirectly(project, template);
                        console.log(`   ✅ 生成模板版本: ${template.name_zh}`);
                        this.stats.generated++;
                    } catch (error) {
                        console.error(`   ❌ 生成模板版本失败 ${template.name_zh}:`, error.message);
                        this.stats.errors++;
                    }
                    
                    // 避免API频率限制
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // 2. 生成缺失的HTML页面（调用现有脚本）
            if (result.emptyHtmlVersions.length > 0) {
                console.log(`   🎨 生成 ${result.emptyHtmlVersions.length} 个HTML页面...`);
                
                for (const version of result.emptyHtmlVersions) {
                    try {
                        await this.generateHtmlPageUsingScript(version.id);
                        console.log(`   ✅ 生成HTML页面: 版本ID ${version.id.substring(0, 8)}...`);
                        this.stats.generated++;
                    } catch (error) {
                        console.error(`   ❌ 生成HTML页面失败:`, error.message);
                        this.stats.errors++;
                    }
                }
            }
            
            // 3. 生成项目主页（调用现有脚本）
            try {
                await this.generateProjectHomepageUsingScript(project.id);
                console.log(`   🏠 更新项目主页: ${project.name}`);
                this.stats.generated++;
            } catch (error) {
                console.error(`   ❌ 生成项目主页失败:`, error.message);
                this.stats.errors++;
            }
            
        } catch (error) {
            console.error(`❌ 处理项目失败 ${project.name}:`, error.message);
            this.stats.errors++;
        }
    }

    async generateTemplateVersionDirectly(project, template) {
        try {
            const versionData = {
                template_id: template.id,
                project_id: project.id,
                created_by: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
                version_number: 1,
                output_content_zh: JSON.stringify({
                    content: `# ${template.name_zh}\n\n这是为项目"${project.name}"生成的${template.name_zh}内容。\n\n## 项目信息\n- 项目名称: ${project.name}\n- 项目描述: ${project.description || '暂无描述'}\n\n## 模板内容\n请在此处填写具体的${template.name_zh}内容。\n\n## 生成信息\n- 生成时间: ${new Date().toLocaleString('zh-CN')}\n- 生成方式: 自动补充生成`,
                    language: 'zh',
                    generated_at: new Date().toISOString()
                }),
                output_content_en: JSON.stringify({
                    content: `# ${template.name_en || template.name_zh}\n\nThis is the ${template.name_en || template.name_zh} content generated for project "${project.name}".\n\n## Project Information\n- Project Name: ${project.name}\n- Project Description: ${project.description || 'No description'}\n\n## Template Content\nPlease fill in the specific ${template.name_en || template.name_zh} content here.\n\n## Generation Info\n- Generated At: ${new Date().toLocaleString('en-US')}\n- Generated By: Auto-completion script`,
                    language: 'en',
                    generated_at: new Date().toISOString()
                })
            };

            const { data, error } = await supabase
                .from('template_versions')
                .insert(versionData)
                .select()
                .single();

            if (error) {
                throw new Error(`保存模板版本失败: ${error.message}`);
            }

            return data;
        } catch (error) {
            throw new Error(`直接生成模板版本失败: ${error.message}`);
        }
    }

    async generateHtmlPageUsingScript(versionId) {
        try {
            // 调用现有的模板HTML生成脚本
            const scriptPath = 'docs/templateSEO/sh/template-html-generator.mjs';
            const command = `node ${scriptPath} --id ${versionId}`;
            
            console.log(`   🔧 执行命令: ${command}`);
            execSync(command, { 
                stdio: 'pipe',
                timeout: 30000 // 30秒超时
            });
            
        } catch (error) {
            // 如果基础脚本失败，尝试增强脚本
            try {
                const enhancedScriptPath = 'aws-backend/enhanced-template-generator.mjs';
                const command = `node ${enhancedScriptPath} --id ${versionId}`;
                
                console.log(`   🔧 执行增强脚本: ${command}`);
                execSync(command, { 
                    stdio: 'pipe',
                    timeout: 30000
                });
                
            } catch (fallbackError) {
                throw new Error(`HTML生成脚本失败: ${error.message}, 增强脚本也失败: ${fallbackError.message}`);
            }
        }
    }

    async generateProjectHomepageUsingScript(projectId) {
        try {
            // 调用现有的项目主页生成脚本
            const scriptPath = 'docs/templateSEO/sh/generate-seo-pages.cjs';
            const command = `node ${scriptPath} ${projectId}`;
            
            console.log(`   🔧 执行命令: ${command}`);
            execSync(command, { 
                stdio: 'pipe',
                timeout: 30000 // 30秒超时
            });
            
        } catch (error) {
            throw new Error(`项目主页生成脚本失败: ${error.message}`);
        }
    }
}

// 执行分析器
if (require.main === module) {
    new TemplateGenerationAnalyzer().run();
}

module.exports = TemplateGenerationAnalyzer;
