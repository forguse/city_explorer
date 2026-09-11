
import React from 'react';

interface PrivacyPolicyScreenProps {
    onBack: () => void;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ onBack }) => {
    return (
        <div className="font-sans antialiased text-gray-900 bg-white h-screen overflow-y-auto w-full flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-4xl px-8 py-6 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur z-10 flex items-center justify-between shadow-sm">
                <h1 className="text-xl font-bold text-gray-900">线旅 (LineTrip) 隐私保护指引</h1>
                <button
                    onClick={onBack}
                    className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                    <span className="material-symbols-outlined text-lg">close</span>
                    <span>关闭</span>
                </button>
            </div>

            {/* Document Content */}
            <div className="w-full max-w-4xl px-8 py-10 pb-20 leading-relaxed text-sm md:text-base">
                <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded text-gray-600 text-xs">
                    <p className="font-bold mb-1">【摘要】</p>
                    <p>
                        我们深知个人信息对您的重要性，并会尽力保护您的隐私安全。<br />
                        本指引将重点说明我们如何收集、使用、存储您的信息。核心要点如下：<br />
                        1. 我们仅收集实现功能所必要的各项信息（如用户名、UGC内容）。<br />
                        2. 除非法律法规规定或您同意，我们不会向第三方共享您的信息。<br />
                        3. 您有权查询、更正或删除您的个人信息。
                    </p>
                </div>

                <h2 className="text-xl font-bold mb-6 pb-2 border-b border-gray-100">一、我们收集的信息</h2>
                <div className="space-y-4 mb-8 text-gray-700">
                    <p>在您使用“线旅”服务的过程中，我们会按照合法、正当、必要的原则收集您在使用服务时主动提供的或因为使用服务而产生的信息：</p>
                    <p>1.1 <strong>账号信息：</strong> 当您注册时，我们需要收集您的<strong>用户名、密码</strong>以及<strong>邀请码</strong>。这些是您登录并使用服务的必要信息。</p>
                    <p>1.2 <strong>用户生成内容 (UGC)：</strong> 您在使用服务过程中上传的照片、发表的评论、创建的任务攻略等。这些信息存储在我们的服务器中，以便向您和其他用户展示。</p>
                    <p>1.3 <strong>设备信息与日志：</strong> 为了保障账号安全与系统运行稳定，我们可能会收集您的设备型号、操作系统版本、IP地址、软件版本号以及服务日志信息。</p>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-100 text-xs text-yellow-800">
                        <strong>特别声明：</strong> 本应用目前<strong className="text-yellow-900">不获取</strong>您的精确地理位置权限 (GPS)。您的位置信息仅来源于您主动在帖子中标记的地点文本。
                    </div>
                </div>

                <h2 className="text-xl font-bold mb-6 pb-2 border-b border-gray-100">二、我们如何使用这些信息</h2>
                <div className="space-y-4 mb-8 text-gray-700">
                    <p>我们收集的信息将用于以下用途：</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li><strong>提供服务：</strong> 向您展示图片流、验证您的登录状态。</li>
                        <li><strong>安全保障：</strong> 预防欺诈、检测账号异常、反垃圾信息（如识别恶意频繁发帖）。</li>
                        <li><strong>产品改进：</strong> 分析用户使用习惯（脱敏数据），以优化产品功能布局。</li>
                    </ul>
                </div>

                <h2 className="text-xl font-bold mb-6 pb-2 border-b border-gray-100">三、信息的存储与安全</h2>
                <div className="space-y-4 mb-8 text-gray-700">
                    <p>3.1 <strong>存储地点：</strong> 您的个人信息将存储在中华人民共和国境内的服务器上。</p>
                    <p>3.2 <strong>存储机制：</strong> 鉴于本应用处于“内测阶段”，我们承诺会采取合理的安全措施（如数据库密码哈希加密）来保护您的信息。但请注意，互联网并非绝对安全的环境，由于技术限制和可能存在的恶意攻击，我们无法保证信息百分之百安全。</p>
                    <p>3.3 <strong>数据留存：</strong> 在内测期间，我们可能会因版本更新或功能调整而对数据进行重置（删除）。正式上线前的数据处理规则届时将另行通知。</p>
                </div>

                <h2 className="text-xl font-bold mb-6 pb-2 border-b border-gray-100">四、信息共享与披露</h2>
                <div className="space-y-4 mb-8 text-gray-700">
                    <p>我们承诺不会对外公开披露或向第三方分享您的个人信息，但以下情形除外：</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>已获得您的明确授权或同意；</li>
                        <li>根据法律法规、行政机关或司法机关的要求（如配合反诈调查）。</li>
                    </ul>
                </div>

                <h2 className="text-xl font-bold mb-6 pb-2 border-b border-gray-100">五、您的权利</h2>
                <div className="space-y-4 mb-8 text-gray-700">
                    <p>5.1 <strong>查询与更正：</strong> 您可以在应用内的个人设置页面查阅或修改您的部分账号信息。</p>
                    <p>5.2 <strong>删除与注销：</strong> 如果您希望注销账号，请通过应用内反馈中心提交申请。在核实身份后，我们将协助您删除账号及其关联的所有数据。<strong>注销操作是不可逆的。</strong></p>
                </div>

                <div className="text-center mt-12 mb-8">
                    <p className="font-bold text-lg text-gray-900">线旅 (LineTrip) 运营团队</p>
                    <p className="text-gray-500 text-sm mt-1">最近更新日期：2026年1月26日</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyScreen;
