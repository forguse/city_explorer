
import React from 'react';

interface UserAgreementScreenProps {
    onBack: () => void;
}

const UserAgreementScreen: React.FC<UserAgreementScreenProps> = ({ onBack }) => {
    return (
        <div className="font-sans antialiased text-gray-900 bg-white h-screen overflow-y-auto w-full flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-4xl px-6 py-4 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur z-10 flex items-center justify-between shadow-sm">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">线旅 (LineTrip) 用户协议</h1>
                <button
                    onClick={onBack}
                    className="p-2 -mr-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-center"
                    aria-label="关闭"
                >
                    <span className="material-symbols-outlined text-2xl">close</span>
                </button>
            </div>

            {/* Document Content */}
            <div className="w-full max-w-4xl px-8 py-10 pb-20 leading-relaxed text-sm md:text-base text-justify">

                {/* 导言 */}
                <div className="mb-8 space-y-4">
                    <h2 className="text-lg font-bold">导言</h2>
                    <p>
                        《线旅 (LineTrip) 用户协议》（以下简称“本协议”）由您与线旅服务提供方（以下简称“我们”或“平台”）共同缔结，本协议具有合同效力。
                    </p>
                    <p className="font-bold">
                        请您务必审慎阅读、充分理解各条款内容。如果您对本协议或线旅服务有任何疑问、投诉或建议，可通过 GitHub中city_explorer项目的 Issue 页面联系开发者。
                    </p>
                    <p>
                        <span className="font-bold border-b-2 border-yellow-300">您点击同意、接受或下一步，或您注册、使用线旅服务均视为您已阅读并同意签署本协议。</span>
                    </p>
                </div>

                {/* 一、定义 */}
                <div className="mb-8 space-y-4">
                    <h2 className="text-lg font-bold">一、【定义】</h2>
                    <p><strong>1.1 本协议：</strong> 指本协议正文、《线旅隐私政策》及具体活动规则（如有）。上述内容一经正式发布，即为本协议不可分割的组成部分。</p>
                    <p><strong>1.2 线旅服务：</strong> 指平台向您提供的与城市探索、内容分享相关的各项在线运营服务。</p>
                </div>

                {/* 二、账号管理 */}
                <div className="mb-8 space-y-4">
                    <h2 className="text-lg font-bold">二、【账号管理与内测规范】</h2>

                    <div className="bg-red-50 p-4 rounded border border-red-100 mb-4">
                        <p className="font-bold text-red-800 mb-2">2.1 内测期特别声明 (Beta Disclaimer)：</p>
                        <p className="text-red-700 text-sm">
                            您充分理解并同意，为高效利用服务器资源，在此内测期间，您的账号以及其下相关数据将<strong>不被保证永久保留</strong>。本项目有权在内测期间的任何时刻，对该账号及其账号下的数据及相关信息采取<strong>删除、清空或重置</strong>等处置措施。
                        </p>
                    </div>

                    <p><strong>2.2 注册与实名：</strong> 使用本服务需使用国内常见实名邮箱（QQ/网易等）注册。内测期间虽不强制上传身份证，但您仍需对账户行为负责。</p>
                    <p><strong>2.3 账号归属：</strong> 账号所有权归平台所有。您仅有使用权，禁止租赁、售卖。</p>
                </div>

                {/* 三、用户信息收集 */}
                <div className="mb-8 space-y-4">
                    <h2 className="text-lg font-bold">三、【用户信息收集与保护】</h2>
                    <p>我们将按照《线旅隐私政策》及国家法律法规保护您的个人信息。</p>
                </div>

                {/* 四、服务许可与权利声明 (新增) */}
                <div className="mb-8 space-y-4">
                    <h2 className="text-xl font-bold border-b pb-2">四、【服务许可与权利声明】</h2>

                    <h3 className="font-bold text-base mt-4 mb-2">4.1 许可范围</h3>
                    <p>在您遵守本协议及相关法律法规的前提下，平台给予您一项个人的、不可转让及非排他性的许可，以使用线旅服务。您仅可为非商业目的使用本服务，包括：</p>
                    <ul className="list-disc pl-6 space-y-1 text-gray-700">
                        <li>接收、下载、安装、启动、升级、登录、显示、运行和/或截屏线旅客户端；</li>
                        <li>创建账户，设置个人资料，查阅规则，使用发布功能、评论功能、分享功能；</li>
                        <li>使用平台支持并允许的其他某一项或几项功能。</li>
                    </ul>

                    <h3 className="font-bold text-base mt-6 mb-2">4.2 禁止录制与传播</h3>
                    <p>您在使用线旅服务过程中，不得未经平台许可以任何方式录制、直播或向他人传播线旅平台内容，包括但不限于不得利用任何第三方软件进行网络直播、传播等。线旅官方有权追责您的行为。</p>

                    <h3 className="font-bold text-base mt-6 mb-2">4.3 权利保留</h3>
                    <p>本协议未明示授权的其他一切权利仍由平台保留，您在行使这些权利时须另外取得平台的书面许可。</p>

                    <h3 className="font-bold text-base mt-6 mb-2">4.4 违约责任</h3>
                    <p>如果您违反本协议任何约定的，平台有权采取本协议<strong>第五章（用户行为规范）</strong>规定的一种或多种处理措施，并可公布处理结果，且有权要求您赔偿因您违约行为而给平台造成的所有损失。</p>

                    <h3 className="font-bold text-base mt-6 mb-2">4.5 免责与赔偿</h3>
                    <p>您充分理解并同意，因您违反本协议或相关服务条款的规定，导致或产生第三方主张的任何索赔、要求或损失，您应当独立承担责任；平台因此遭受损失的，您也应当一并赔偿。</p>

                    <h3 className="font-bold text-base mt-6 mb-2">4.6 虚拟权益说明</h3>
                    <p>您充分理解并同意：平台内的虚拟权益（如等级、成就、徽章等）是线旅服务的一部分。平台在此许可您依本协议而获得其使用权。您应遵循平台规则使用。同时，虚拟权益可能受到一定有效期限的限制，即使您在规定的有效期内未使用，除不可抗力或可归责于平台的原因外，一旦有效期届满，将会自动失效。</p>
                    <p className="mt-2 text-sm text-gray-600">为更好地向用户提供服务，平台有权对虚拟权益相关内容（包括但不限于设计、性能及相关数值设置等）作出调整、更新或优化。</p>

                    <h3 className="font-bold text-base mt-6 mb-2">4.7 系统安全与作弊打击</h3>
                    <p>您充分理解并同意：为保障您账号安全，为营造公平、健康及安全的环境，在您使用线旅服务的过程中，在不违反相关法律规定情况下，<strong>平台可以通过技术手段了解您终端设备的随机存储内存以及与线旅同时运行的相关程序。</strong>一经发现有任何未经授权的、危害平台服务正常运营的相关程序，平台可以采取合理措施予以打击。</p>
                </div>

                {/* 五、用户行为规范 */}
                <div className="mb-8 space-y-4">
                    <h2 className="text-xl font-bold border-b pb-2">五、【用户行为规范 (Code of Conduct)】</h2>
                    <p className="text-gray-500 text-sm">本章节为核心条款，请仔细阅读。违反以下规定将导致您的账号被封禁。</p>

                    <h3 className="font-bold text-base mt-6 mb-2">5.1 严禁发布违法违规信息</h3>
                    <p>您在使用线旅服务时，须自觉遵守法律法规。<strong>严禁制作、复制、发布或传播</strong>含有下列内容的信息：</p>
                    <ul className="list-disc pl-6 space-y-1 text-gray-700">
                        <li>违反宪法确定的基本原则的；</li>
                        <li>危害国家安全、泄露国家秘密、颠覆国家政权、破坏国家统一的；</li>
                        <li>损害国家荣誉和利益的；</li>
                        <li>歪曲、丑化、亵渎、否定英雄烈士事迹和精神，或侵害其姓名、肖像、名誉、荣誉的；</li>
                        <li>宣扬恐怖主义、极端主义或煽动实施相关活动的；</li>
                        <li>煽动民族仇恨、民族歧视，破坏民族团结的；</li>
                        <li>破坏国家宗教政策，宣扬邪教和封建迷信的；</li>
                        <li>散布谣言，扰乱社会秩序，破坏社会稳定的；</li>
                        <li>散布淫秽、色情、赌博、暴力、凶杀、恐怖或者教唆犯罪的；</li>
                        <li>侮辱或者诽谤他人，侵害他人名誉、隐私和其他合法权益的；</li>
                        <li>违背社会公德、公序良俗的；</li>
                        <li>法律、行政法规和国家规定禁止的其他内容。</li>
                    </ul>

                    <h3 className="font-bold text-base mt-6 mb-2">5.2 严禁发布不良网络信息</h3>
                    <p>为了维护健康的网络生态，您不得利用本服务制作或传播以下不良信息：</p>
                    <ul className="list-disc pl-6 space-y-1 text-gray-700">
                        <li>使用夸张标题，内容与标题严重不符的（“标题党”）；</li>
                        <li>炒作八卦绯闻、丑闻、劣迹的；</li>
                        <li>不当评述自然灾害、重大事故等灾难话题的；</li>
                        <li>带有性暗示、性挑逗等易令人产生不当联想的；</li>
                        <li>展现血腥、惊悚、残忍等引人身心不适的；</li>
                        <li>煽动人群歧视、地域歧视的；</li>
                        <li>宣扬低俗、庸俗、媚俗内容的；</li>
                        <li>可能引发未成年人模仿不安全行为、违反社会公德或诱导不良嗜好的；</li>
                        <li>其他对网络生态造成不良影响的内容。</li>
                    </ul>

                    <h3 className="font-bold text-base mt-6 mb-2">5.3 软件使用与技术规范</h3>
                    <p>除非法律允许或平台书面许可，您不得从事下列危害系统安全的行为：</p>
                    <ul className="list-disc pl-6 space-y-1 text-gray-700">
                        <li>删除软件及副本上关于著作权的信息；</li>
                        <li>对软件进行反向工程、反向汇编、反向编译，或尝试获取源代码；</li>
                        <li>对软件进行扫描、探查、测试以查找漏洞（BUG）；</li>
                        <li>修改或伪造软件运行中的指令、数据，包括增加、删减功能（无论是否为商业目的）；</li>
                        <li>使用、制作、传播非官方授权的第三方软件、插件等；</li>
                        <li>未经授权对平台拥有知识产权的内容进行出租、复制、修改、链接、转载或建立镜像站点；</li>
                        <li>建立镜像站点、网页快照，或利用私设服务器提供与本服务相似的服务（“私服”）；</li>
                        <li>将软件的任意部分分离单独使用；</li>
                        <li>修改或遮盖软件的名称、商标或知识产权标识；</li>
                        <li>其他未经平台明示授权的技术行为。</li>
                    </ul>

                    <h3 className="font-bold text-base mt-6 mb-2">5.4 违规行为详述</h3>
                    <p>在使用服务过程中，若出现以下行为，平台有权视情节严重程度进行处理：</p>
                    <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                        <li><strong>违规内容：</strong> 上传违法或不当词语、字符、图片（包括用于昵称、任务名称）；</li>
                        <li><strong>破坏服务：</strong>
                            <ul className="list-disc pl-4 mt-1 text-sm text-gray-600">
                                <li>恶意批量注册、破坏服务器鉴权、恶意挤服；</li>
                                <li>实施 DDOS 攻击、导致服务器宕机或卡顿；</li>
                                <li>利用漏洞获益或破坏正常使用环境；</li>
                            </ul>
                        </li>
                        <li><strong>传播非法言论：</strong> 在社区内散布上述禁止的内容；</li>
                        <li><strong>账号安全：</strong> 盗取他人账号、物品；进行账号非法交易、共享；</li>
                        <li><strong>冒充官方：</strong> 伪称内部员工或特殊身份企图欺诈；</li>
                        <li><strong>其他：</strong> 违反国家法律法规、违反本协议、公认的不当行业行为。</li>
                    </ol>

                    <h3 className="font-bold text-base mt-6 mb-2 border-l-4 border-red-500 pl-3">5.5 违规处理措施</h3>
                    <p className="mb-2">若您实施了上述行为，平台有权采取以下一种或多种措施，并公告处理结果：</p>
                    <div className="bg-gray-100 p-4 rounded text-sm space-y-1 mb-6">
                        <p>(1) <strong>警告</strong>；</p>
                        <p>(2) <strong>禁言</strong>；</p>
                        <p>(3) <strong>内容重置</strong>（强制修改昵称、删除违规图片/帖子）；</p>
                        <p>(4) <strong>扣除收益</strong>（扣除经验值、等级、虚拟道具等）；</p>
                        <p>(5) <strong>删除数据</strong>（删除账号数据）；</p>
                        <p>(6) <strong>限制功能</strong>（禁止使用特定功能）；</p>
                        <p>(7) <strong>强制下线</strong>；</p>
                        <p>(8) <strong>封号</strong>（暂时或永久禁止登录）；</p>
                        <p>(9) <strong>封设备</strong>（禁止特定终端设备登录）；</p>
                        <p>(10) <strong>终止服务</strong>；</p>
                        <p>(11) <strong>法律追责</strong>（提起民事诉讼要求赔偿，或移交行政/司法机关追究责任）。</p>
                    </div>

                    <h3 className="font-bold text-base mt-6 mb-2">5.6 AI 生成内容标识义务</h3>
                    <p className="mb-2">为落实《人工智能生成合成内容标识办法》及相关法律法规，若您发布的 UGC 内容包含人工智能生成的要素，<strong>您有义务自行显式标识</strong>。具体要求如下：</p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-700">
                        <li>
                            <strong>(1) 文本内容：</strong> 在文本的起始/末尾/中间或交互界面顶部/底部/背景等适当位置添加“AI生成/合成”或其他同时包含人工智能要素和生成合成要素的文字或角标标识；
                        </li>
                        <li>
                            <strong>(2) 图片内容：</strong> 在图片的边角位置添加“AI生成/合成”或其他同时包含人工智能要素和生成合成要素的标识；
                        </li>
                        <li>
                            <strong>(3) 其他场景：</strong> 根据人工智能生成合成服务场景自身应用特点，在适当位置添加“AI生成/合成”或其他同时包含人工智能要素和生成合成要素的标识。
                        </li>
                    </ul>
                    <p className="mt-3 text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100 text-sm">
                        特别提示：用户须自行履行上述标识义务。因用户未规范标识而导致的任何法律纠纷、行政处罚或第三方索赔，均由用户自行承担全部责任，平台不承担任何连带责任。
                    </p>
                </div>

                {/* 六、知识产权 */}
                <div className="mb-8 space-y-4">
                    <h2 className="text-lg font-bold">六、【知识产权与UGC授权】</h2>
                    <p>6.1 平台享有软件一切知识产权。</p>
                    <p>6.2 <strong>UGC 永久授权：</strong> 您同意授予平台对您发布的UGC内容享有全球范围内、永久、免费、不可撤销的非独家使用权。即使注销账号，平台仍有权展示该内容。</p>
                </div>

                {/* 七、遵守当地法律 */}
                <div className="mb-8 space-y-4">
                    <h2 className="text-lg font-bold">七、【遵守当地法律监管】</h2>
                    <p>7.1 您在使用线旅服务过程中应当遵守当地相关的法律法规，并尊重当地的道德和风俗习惯。如果您的行为违反了当地法律法规或道德风俗，您应当为此独立承担责任。</p>
                    <p>7.2 <strong className="text-red-700">政治中立原则：</strong> 您应避免因使用线旅服务而使平台卷入政治和公共事件，否则平台有权暂停或终止对您的服务。</p>
                </div>

                {/* 八、其他 */}
                <div className="mb-8 space-y-4">
                    <h2 className="text-lg font-bold">八、【其他】</h2>
                    <p>8.1 <strong>法律适用与管辖：</strong> 本协议之订立、生效、解释、修订、补充、终止、执行与争议解决均适用<strong>中华人民共和国大陆地区法律</strong>（不包含港澳台地区法律）。</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>特别说明：</strong> 虽然本应用服务器可能部署于中国香港或其他境外地区，但本应用主要面向中国大陆地区用户运营。因此，您在使用本服务时，必须严格遵守<strong>中国大陆地区</strong>的所有法律法规。如您的行为违反大陆地区法律（即使该行为在服务器所在地可能合法），平台仍有权依据本协议对您进行封禁处理。
                    </p>
                    <p>8.2 若您和平台之间发生任何纠纷或争议，应友好协商解决；协商不成的，您同意将纠纷或争议提交至本协议签订地有管辖权的人民法院管辖。</p>
                    <p>8.3 线旅有权在必要时变更本协议条款。本协议条款变更后，如果您继续使用线旅服务，即视为您已接受变更后的协议。</p>
                </div>

                <div className="text-center mt-16 mb-8 pt-8 border-t border-gray-100">
                    <p className="font-bold text-lg text-gray-900">线旅 (LineTrip) 开发团队</p>
                    <p className="text-gray-500 text-sm mt-1">COPYRIGHT © 2026 LINETRIP. ALL RIGHTS RESERVED.</p>
                </div>
            </div>
        </div>
    );
};

export default UserAgreementScreen;
