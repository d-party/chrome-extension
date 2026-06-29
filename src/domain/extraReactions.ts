/**
 * エクストラリアクションのカタログ（最大100種）。
 *
 * 各エントリは Noto Animated Emoji（黄色＝肌色 modifier なし）と react-icons の
 * 静的アイコンを 1 対 1 で対応させたもの。`id` は Noto のコードポイント文字列で、
 * WebSocket の `reaction_type` および同梱 Lottie（`reactions/lottie/extra/<id>.json`）
 * のキーを兼ねる。`reactIcon` は {@link REACTION_ICONS}（react-icons）のキー。
 *
 * デフォルトリアクション（{@link DEFAULT_REACTIONS}）はここには含めない。統計は
 * デフォルトのみが対象で、エクストラは集計しない。
 *
 * 採用基準: dアニメストアの CSP 下で確実に再生できるよう、expression（実行時 eval）・
 * 非対応 effects・テキストレイヤを含まない Lottie のみを選定している。
 *
 * アニメーション素材は Google Noto Emoji（Apache License 2.0）。
 */

export interface ExtraReaction {
  /** Noto コードポイント。WS `reaction_type` と Lottie キーを兼ねる。 */
  id: string;
  /** 日本語表示名（ツールチップ等）。 */
  label: string;
  /** {@link REACTION_ICONS} のキー（react-icons）。 */
  reactIcon: string;
}

export const EXTRA_REACTIONS: ExtraReaction[] = [
  { id: "1f44e", label: "よくないね", reactIcon: "FaThumbsDown" },
  { id: "270c", label: "ピース", reactIcon: "FaHandPeace" },
  { id: "1f596", label: "バルカン", reactIcon: "FaHandSpock" },
  { id: "2702", label: "チョキ", reactIcon: "FaScissors" },
  { id: "1f447", label: "下", reactIcon: "FaHandPointDown" },
  { id: "1f448", label: "左", reactIcon: "FaHandPointLeft" },
  { id: "1f449", label: "右", reactIcon: "FaHandPointRight" },
  { id: "1f44f", label: "拍手", reactIcon: "FaHandsClapping" },
  { id: "1f64f", label: "お願い", reactIcon: "FaHandsPraying" },
  { id: "1f44a", label: "パンチ", reactIcon: "FaHandFist" },
  { id: "270b", label: "てのひら", reactIcon: "FaHand" },
  { id: "1f91d", label: "握手", reactIcon: "FaHandshake" },
  { id: "1f494", label: "失恋", reactIcon: "FaHeartCrack" },
  { id: "1f525", label: "ファイア", reactIcon: "FaFire" },
  { id: "1f4a9", label: "うんち", reactIcon: "FaPoo" },
  { id: "1f480", label: "どくろ", reactIcon: "FaSkull" },
  { id: "2b50", label: "スター", reactIcon: "FaStar" },
  { id: "26a1", label: "いなずま", reactIcon: "FaBolt" },
  { id: "1f4a3", label: "爆弾", reactIcon: "FaBomb" },
  { id: "1f47b", label: "おばけ", reactIcon: "FaGhost" },
  { id: "1f381", label: "プレゼント", reactIcon: "FaGift" },
  { id: "1f382", label: "ケーキ", reactIcon: "FaCakeCandles" },
  { id: "1f3c6", label: "トロフィー", reactIcon: "FaTrophy" },
  { id: "1f451", label: "王冠", reactIcon: "FaCrown" },
  { id: "1f514", label: "ベル", reactIcon: "FaBell" },
  { id: "1f9e0", label: "ひらめき", reactIcon: "FaBrain" },
  { id: "1f680", label: "ロケット", reactIcon: "FaRocket" },
  { id: "1f441", label: "目", reactIcon: "FaEye" },
  { id: "1f431", label: "ねこ", reactIcon: "FaCat" },
  { id: "1f438", label: "かえる", reactIcon: "FaFrog" },
  { id: "1f577", label: "くも", reactIcon: "FaSpider" },
  { id: "26f5", label: "ヨット", reactIcon: "FaSailboat" },
  { id: "1f41f", label: "さかな", reactIcon: "FaFish" },
  { id: "1f409", label: "ドラゴン", reactIcon: "FaDragon" },
  { id: "1f4f8", label: "カメラ", reactIcon: "FaCamera" },
  { id: "1f9a6", label: "カワウソ", reactIcon: "FaOtter" },
  { id: "1f42e", label: "うし", reactIcon: "FaCow" },
  { id: "1f99f", label: "か", reactIcon: "FaMosquito" },
  { id: "1fab1", label: "みみず", reactIcon: "FaWorm" },
  { id: "1f43e", label: "あしあと", reactIcon: "FaPaw" },
  { id: "1f9b4", label: "ほね", reactIcon: "FaBone" },
  { id: "2744", label: "ゆき", reactIcon: "FaSnowflake" },
  { id: "2601", label: "くも(雲)", reactIcon: "FaCloud" },
  { id: "1f343", label: "はっぱ", reactIcon: "FaLeaf" },
  { id: "1f341", label: "もみじ", reactIcon: "FaCanadianMapleLeaf" },
  { id: "1f331", label: "め", reactIcon: "FaSeedling" },
  { id: "1f48e", label: "ほうせき", reactIcon: "FaGem" },
  { id: "1f34e", label: "りんご", reactIcon: "FaAppleWhole" },
  { id: "1f955", label: "にんじん", reactIcon: "FaCarrot" },
  { id: "1f9c0", label: "チーズ", reactIcon: "FaCheese" },
  { id: "1f36a", label: "クッキー", reactIcon: "FaCookie" },
  { id: "1f366", label: "アイス", reactIcon: "FaIceCream" },
  { id: "1f354", label: "ハンバーガー", reactIcon: "FaBurger" },
  { id: "1f355", label: "ピザ", reactIcon: "FaPizzaSlice" },
  { id: "1f377", label: "ワイン", reactIcon: "FaWineGlass" },
  { id: "1f34b", label: "レモン", reactIcon: "FaLemon" },
  { id: "1f357", label: "チキン", reactIcon: "FaDrumstickBite" },
  { id: "1f953", label: "ベーコン", reactIcon: "FaBacon" },
  { id: "1f35e", label: "パン", reactIcon: "FaBreadSlice" },
  { id: "1f32d", label: "ホットドッグ", reactIcon: "FaHotdog" },
  { id: "1f415", label: "いぬ", reactIcon: "FaDog" },
  { id: "1f40e", label: "うま", reactIcon: "FaHorse" },
  { id: "1f31e", label: "たいよう", reactIcon: "FaSun" },
  { id: "1f31b", label: "つき", reactIcon: "FaMoon" },
  { id: "1f332", label: "き", reactIcon: "FaTree" },
  { id: "1f37b", label: "ビール", reactIcon: "FaBeerMugEmpty" },
  { id: "26bd", label: "サッカー", reactIcon: "FaFutbol" },
  { id: "1f3c0", label: "バスケ", reactIcon: "FaBasketball" },
  { id: "26be", label: "やきゅう", reactIcon: "FaBaseball" },
  { id: "1f3b3", label: "ボウリング", reactIcon: "FaBowlingBall" },
  { id: "1f3d3", label: "たっきゅう", reactIcon: "FaTableTennisPaddleBall" },
  { id: "1f3b2", label: "サイコロ", reactIcon: "FaDice" },
  { id: "1f3b8", label: "ギター", reactIcon: "FaGuitar" },
  { id: "1f941", label: "ドラム", reactIcon: "FaDrum" },
  { id: "1f3ac", label: "カチンコ", reactIcon: "FaClapperboard" },
  { id: "1f3af", label: "まと", reactIcon: "FaBullseye" },
  { id: "2705", label: "チェック", reactIcon: "FaCircleCheck" },
  { id: "274c", label: "バツ", reactIcon: "FaCircleXmark" },
  { id: "2757", label: "びっくりマーク", reactIcon: "FaExclamation" },
  { id: "2753", label: "はてな", reactIcon: "FaQuestion" },
  { id: "1f4a1", label: "でんきゅう", reactIcon: "FaLightbulb" },
  { id: "1f3c1", label: "ゴール", reactIcon: "FaFlagCheckered" },
  { id: "1f512", label: "かぎ", reactIcon: "FaLock" },
  { id: "1f4ac", label: "ふきだし", reactIcon: "FaComment" },
  { id: "1f4a7", label: "しずく", reactIcon: "FaDroplet" },
  { id: "1f50e", label: "むしめがね", reactIcon: "FaMagnifyingGlass" },
  { id: "1f3ba", label: "おんがく", reactIcon: "FaMusic" },
  { id: "1f600", label: "にっこり", reactIcon: "FaFaceGrin" },
  { id: "1f970", label: "大好き", reactIcon: "FaFaceGrinHearts" },
  { id: "1f923", label: "転げ笑い", reactIcon: "FaFaceGrinSquintTears" },
  { id: "1f929", label: "キラキラ", reactIcon: "FaFaceGrinStars" },
  { id: "1f602", label: "泣き笑い", reactIcon: "FaFaceGrinTears" },
  { id: "1f61b", label: "あっかんべー", reactIcon: "FaFaceGrinTongue" },
  { id: "1f609", label: "ウインク", reactIcon: "FaFaceGrinWink" },
  { id: "1f618", label: "投げキッス", reactIcon: "FaFaceKissWinkHeart" },
  { id: "1f610", label: "無表情", reactIcon: "FaFaceMeh" },
  { id: "1f644", label: "呆れ", reactIcon: "FaFaceRollingEyes" },
  { id: "1f62e", label: "びっくり", reactIcon: "FaFaceSurprise" },
  { id: "1f620", label: "怒り", reactIcon: "FaFaceAngry" },
  { id: "1f988", label: "サメ", reactIcon: "GiSharkFin" },
];

/** id 索引（エクストラのみ）。 */
export const EXTRA_REACTION_BY_ID: Record<string, ExtraReaction> =
  Object.fromEntries(EXTRA_REACTIONS.map((r) => [r.id, r]));
