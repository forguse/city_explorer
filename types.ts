// 赞助商奖励数据
export interface SponsorReward {
  sponsorName: string;            // 赞助商名称
  title: string;                  // 奖励标题
  discountValue: string;          // 折扣数值
  discountUnit: string;           // 折扣单位
  description: string;            // 奖励描述
  expiry: string;                 // 有效期
  image?: string;                 // 奖励图片
  bgImage?: string;               // 背景图片
  code?: string;                  // 优惠码
}

export interface Task {
  id: string;
  title: string;
  location: string;
  image: string;
  likes: number;
  difficulty: 'Simple' | 'Medium' | 'Hard';
  description?: string;
  isAiGenerated?: boolean;
  isSponsored?: boolean;          // 是否为赞助商任务
  sponsorReward?: SponsorReward;  // 赞助商奖励
}

export interface UserProfile {
  name: string;
  avatar: string;
}
