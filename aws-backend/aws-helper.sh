#!/bin/bash

# AWS配置助手脚本
# 帮助用户获取VPC和子网信息

set -e

echo "🔧 AWS配置助手 - 获取VPC和子网信息"
echo "============================================"

# 检查AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI未安装，请先安装"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI配置无效，请运行 aws configure"
    exit 1
fi

echo "✅ AWS CLI配置正常"
echo ""

# 获取当前region
CURRENT_REGION=$(aws configure get region)
echo "🌍 当前AWS区域: $CURRENT_REGION"
echo ""

echo "📋 可用的VPC列表："
echo "==================="

# 列出VPC
aws ec2 describe-vpcs \
    --query 'Vpcs[*].[VpcId,State,CidrBlock,Tags[?Key==`Name`].Value|[0]]' \
    --output table

echo ""
echo "📋 选择VPC后的子网信息："
echo "======================="

read -p "请输入要使用的VPC ID: " VPC_ID

if [ -z "$VPC_ID" ]; then
    echo "❌ VPC ID不能为空"
    exit 1
fi

echo ""
echo "🔍 VPC $VPC_ID 的子网信息："

# 列出指定VPC的子网
aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[*].[SubnetId,AvailabilityZone,CidrBlock,MapPublicIpOnLaunch,Tags[?Key==`Name`].Value|[0]]' \
    --output table

echo ""
echo "💡 选择建议："
echo "- 私有子网 (MapPublicIpOnLaunch: false): 用于ECS任务"
echo "- 公有子网 (MapPublicIpOnLaunch: true): 用于负载均衡器"
echo "- 选择至少2个不同可用区的子网以确保高可用性"
echo ""

read -p "请输入私有子网IDs (逗号分隔): " PRIVATE_SUBNETS
read -p "请输入公有子网IDs (逗号分隔): " PUBLIC_SUBNETS

# 验证子网
echo ""
echo "🔍 验证子网配置..."

if [ -z "$PRIVATE_SUBNETS" ] || [ -z "$PUBLIC_SUBNETS" ]; then
    echo "❌ 子网ID不能为空"
    exit 1
fi

# 检查私有子网
echo "验证私有子网..."
IFS=',' read -ra PRIVATE_ARRAY <<< "$PRIVATE_SUBNETS"
for subnet in "${PRIVATE_ARRAY[@]}"; do
    subnet=$(echo "$subnet" | xargs)  # 去除空格
    ZONE=$(aws ec2 describe-subnets --subnet-ids "$subnet" --query 'Subnets[0].AvailabilityZone' --output text 2>/dev/null || echo "ERROR")
    if [ "$ZONE" = "ERROR" ]; then
        echo "❌ 子网 $subnet 不存在或无权限访问"
        exit 1
    fi
    echo "✅ 私有子网 $subnet 在可用区 $ZONE"
done

# 检查公有子网  
echo "验证公有子网..."
IFS=',' read -ra PUBLIC_ARRAY <<< "$PUBLIC_SUBNETS"
for subnet in "${PUBLIC_ARRAY[@]}"; do
    subnet=$(echo "$subnet" | xargs)  # 去除空格
    ZONE=$(aws ec2 describe-subnets --subnet-ids "$subnet" --query 'Subnets[0].AvailabilityZone' --output text 2>/dev/null || echo "ERROR")
    if [ "$ZONE" = "ERROR" ]; then
        echo "❌ 子网 $subnet 不存在或无权限访问"
        exit 1
    fi
    echo "✅ 公有子网 $subnet 在可用区 $ZONE"
done

# 生成配置文件
echo ""
echo "📝 生成配置文件..."

cat > deploy-config << EOF
# AWS部署参数配置文件
# 由aws-helper.sh自动生成于 $(date)

# AWS 网络配置
VPC_ID=$VPC_ID
SUBNET_IDS=$PRIVATE_SUBNETS
PUBLIC_SUBNET_IDS=$PUBLIC_SUBNETS

# 部署配置
STACK_NAME=productmind-backend
IMAGE_TAG=latest

# SSL配置 (可选)
DOMAIN_NAME=
CERTIFICATE_ARN=
EOF

echo "✅ 配置文件已生成: deploy-config"
echo ""
echo "🎉 配置完成！现在可以运行部署："
echo "   ./deploy-aws.sh --full-deploy"
echo ""
echo "📋 配置摘要："
echo "VPC ID: $VPC_ID"
echo "私有子网: $PRIVATE_SUBNETS"
echo "公有子网: $PUBLIC_SUBNETS" 