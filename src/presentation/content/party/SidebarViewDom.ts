import $ from "jquery";
import Flickity from "flickity";

import type { Notifier, SidebarView } from "@/application/ports";
import type { User } from "@/domain/protocol";
import { FACEBOOK_APP_ID } from "@/infrastructure/env";

import { getParam, makeFontFace } from "../dom/utils";
import "./setupEasing";

export type PartyMode = "create" | "join" | "normal";

/**
 * Builds and controls the in-player sidebar (share / history / users / control
 * panels). Faithful port of sidebar.js, reorganised into a class implementing
 * {@link SidebarView}.
 */
export class SidebarViewDom implements SidebarView {
  private flickity: Flickity | null = null;
  private roomUrl = "";
  mode: PartyMode = "normal";

  constructor(private readonly notifier: Notifier) {}

  /** Construct the sidebar DOM and decide the initial mode from the URL. */
  build(): void {
    makeFontFace();

    $(".videoWrapper").wrap("<div class='playerWrapper'></div>");
    $(".playerWrapper").append("<div class='sidebar'></div>");
    $(".sidebar").append("<div class='sidebar_header'></div>");
    $(".sidebar_header").append("<div><h2 class='sidebar_title'>d-party</h2></div>");
    $(".sidebar_header").append(
      "<div class='carousel_wrapper'><div class='carousel' data-flickity></div>",
    );
    $(".carousel").append(
      "<div class='carousel-cell' id='carousel_share'><h3>シェア</h3></div>",
    );
    $(".carousel").append(
      "<div class='carousel-cell' id='carousel_history'><h3>履歴</h3></div>",
    );
    $(".carousel").append(
      "<div class='carousel-cell' id='carousel_users'><h3>ルーム参加者</h3></div>",
    );
    $(".carousel").append(
      "<div class='carousel-cell' id='carousel_control'><h3>コントロール</h3></div>",
    );
    this.flickity = new Flickity(".carousel", { draggable: false });

    $(".sidebar").append("<div class='sidebar_content'></div>");
    $(".sidebar_content").append(
      "<h3 class='sidebar_create_title create_content'>パーティールームを作成</h3>",
    );
    $(".sidebar_content").append(
      "<p class='sidebar_create_text create_content'>パーティーを主催して</p>",
    );
    $(".sidebar_content").append(
      "<p class='sidebar_create_text create_content'>みんなで同時に鑑賞しよう！</p>",
    );
    $(".sidebar_content").append(
      "<button class='sidebar_create create_content'type='button'>Create Room</button>",
    );

    $(".sidebar").append("<div class='sidebar_footer'></div>");
    $(".sidebar_footer").append("<p class='footer_content''>powerd by U-Not</p>");

    $(".create_content").hide(0);
    $(".sidebar_header").hide(0);
    $(".sidebar_footer").hide(0);
    $(".sidebar_header").fadeIn(1000);
    $(".sidebar_footer").fadeIn(1000);

    // Share panel
    $(".sidebar_content").append(
      "<h3 class='sidebar_create_title share_content'>パーティーリンクをシェア</h3>",
    );
    $(".sidebar_content").append(
      "<p class='sidebar_create_text share_content'>ルームに参加しました</p>",
    );
    $(".sidebar_content").append(
      "<p class='sidebar_create_text share_content'>友達をパーティーに招待しよう</p>",
    );
    $(".sidebar_content").append(
      "<div class='sidebar_share_button share_content'></div>",
    );
    $(".sidebar_share_button").append(
      "<button class='knopf positive even huge pill m-8 twitter_share share_button'><i class='fab fa-twitter'></i></button>",
    );
    $(".sidebar_share_button").append(
      "<button class='knopf positive even huge pill m-8 line_share share_button'><i class='fab fa-line'></i></button>",
    );
    $(".sidebar_share_button").append(
      "<button class='knopf positive even huge pill m-8 facebook_share share_button'><i class='fab fa-facebook'></i></button>",
    );
    $(".sidebar_share_button").append(
      "<button class='knopf positive even huge pill m-8 mail_share share_button'><i class='fas fa-envelope'></i></button>",
    );
    $(".sidebar_content").append(
      "<div class='sidebar_copy_link share_content'></div>",
    );
    $(".sidebar_copy_link").append("<p class='sidebar_link share_content'></p>");
    $(".sidebar_copy_link").append(
      "<a class='material-icons sidebar_copy_icons share_content'>content_copy</span>",
    );

    // Users panel
    $(".sidebar_content").append(
      "<div class='sidebar_flex_start_wrapper users_content users_wrapper'></div>",
    );
    // History panel
    $(".sidebar_content").append(
      "<div class='sidebar_flex_start_wrapper history_content history_wrapper'></div>",
    );
    // Control panel
    $(".sidebar_content").append(
      "<h3 class='sidebar_create_title control_content'>パーティールームから退室</h3>",
    );
    $(".sidebar_content").append(
      "<p class='sidebar_create_text control_content'>退室しサイドバーを閉じる</p>",
    );
    $(".sidebar_content").append(
      "<button class='sidebar_control control_content'type='button' id='sidebar_leave_button'>leave</button>",
    );

    $(".share_content").hide(0);
    $(".control_content").hide(0);
    $(".users_content").hide(0);
    $(".history_content").hide(0);

    this.applyModeFromUrl();
  }

  private applyModeFromUrl(): void {
    if (getParam("party") === "create") {
      this.showCreate();
      document.getElementById("video")?.removeAttribute("autoplay");
      this.mode = "create";
    } else if (getParam("party") === "join") {
      this.showJoin();
      document.getElementById("video")?.removeAttribute("autoplay");
      this.mode = "join";
    } else {
      this.hideSidebar();
    }
  }

  // -- SidebarView -----------------------------------------------------------

  setShareLink(roomUrl: string): void {
    this.roomUrl = roomUrl;
    const link = document.getElementsByClassName("sidebar_link")[0];
    if (link) link.innerHTML = roomUrl;
  }

  addHistoryUser(userName: string): void {
    $(".history_wrapper").append(
      `<p class='history_user_text history_content'>『${userName}』さんが入室</p>`,
    );
    this.scrollHistoryToBottom();
  }

  leaveHistoryUser(userName: string): void {
    $(".history_wrapper").append(
      `<p class='history_user_text history_content'>『${userName}』さんが退室</p>`,
    );
    this.scrollHistoryToBottom();
  }

  addHistory(text: string): void {
    const now = new Date();
    const time =
      ("0" + now.getHours()).slice(-2) +
      ":" +
      ("0" + now.getMinutes()).slice(-2) +
      ":" +
      ("0" + now.getSeconds()).slice(-2);
    $(".history_wrapper").append(
      `<div class='history_text_wrapper history_content'><p class='history_text history_time'>[ ${time} ]</p><p class='history_text_content history_text'>${text}</p></div>`,
    );
    this.scrollHistoryToBottom();
  }

  updateUserList(users: User[]): void {
    const oldUserIds: string[] = [];
    const userIds: string[] = [];
    document.querySelectorAll(".users_item").forEach((item) => {
      const id = item.getAttribute("id");
      if (id) oldUserIds.push(id);
    });
    users.forEach((user) => {
      this.addUserItem(user.user_id, user.user_name);
      userIds.push("users-" + user.user_id);
    });
    oldUserIds
      .filter((id) => userIds.indexOf(id) === -1)
      .forEach((id) => this.removeUserItem(id));
  }

  hideSidebar(): void {
    $(".sidebar").hide(0);
  }

  // -- sidebar controls (used by the wiring) ---------------------------------

  showSidebar(): void {
    $(".sidebar").show(0);
  }

  showCreate(): void {
    $(".create_content").fadeIn(1000);
  }

  showJoin(): void {
    $(".share_content").fadeIn(1000);
    $(".carousel_wrapper").animate(
      { opacity: 100 },
      { duration: 1000, easing: "easeOutQuart" },
    );
  }

  changeCreate(onCreated: () => void): void {
    $(".create_content").fadeOut(1000, () => this.showJoin());
    window.setTimeout(onCreated, 1000);
  }

  selectedCellId(): string | undefined {
    return this.flickity?.selectedElement?.id;
  }

  /** Switch the visible sidebar panel based on the selected carousel cell. */
  changeSidebarContent(onUsersPanel: () => void): void {
    switch (this.selectedCellId()) {
      case "carousel_share":
        $(".history_content").fadeOut(250, () => $(".share_content").fadeIn(250));
        $(".history_content").hide(0);
        break;
      case "carousel_history":
        this.scrollHistoryToBottom();
        $(".share_content").fadeOut(250, () => $(".history_content").fadeIn(250));
        $(".share_content").hide(0);
        $(".users_content").fadeOut(250);
        $(".users_content").hide(0);
        break;
      case "carousel_users":
        onUsersPanel();
        $(".control_content").fadeOut(250, () => $(".users_content").fadeIn(250));
        $(".control_content").hide(0);
        $(".history_content").fadeOut(250);
        $(".history_content").hide(0);
        break;
      case "carousel_control":
        $(".users_content").fadeOut(250, () => $(".control_content").fadeIn(250));
        $(".users_content").hide(0);
        break;
    }
  }

  /** Bind the copy-link and social share buttons (called on window load). */
  bindShareControls(): void {
    const copy = document.getElementsByClassName("sidebar_copy_link")[0] as HTMLElement | undefined;
    if (copy) {
      copy.onclick = () => {
        void navigator.clipboard.writeText(this.roomUrl);
        const icon = document.getElementsByClassName("sidebar_copy_icons")[0];
        if (icon) icon.innerHTML = "done";
        window.setTimeout(() => {
          if (icon) icon.innerHTML = "content_copy";
        }, 1000);
        this.notifier.success("共有リンクをコピーしました");
      };
    }
    this.bindClick("twitter_share", () => {
      const text =
        `dアニメストアで『${this.shareTitle()}』を一緒に見ませんか？ 拡張機能『d-party』を使ってパーティーに参加してください`;
      const url =
        "https://twitter.com/intent/tweet?text=" +
        encodeURIComponent(text) +
        "&url=" +
        encodeURIComponent(this.roomUrl) +
        "&hashtags=" +
        encodeURIComponent("dアニメストア,dパーティー");
      window.open(url, "", "width=700,height=300");
    });
    this.bindClick("line_share", () => {
      window.open(
        "https://social-plugins.line.me/lineit/share?url=" +
          encodeURIComponent(this.roomUrl),
        "",
      );
    });
    this.bindClick("facebook_share", () => {
      window.open(
        "https://www.facebook.com/dialog/share?app_id=" +
          FACEBOOK_APP_ID +
          "&href=" +
          encodeURIComponent(this.roomUrl),
        "",
        "width=700,height=400",
      );
    });
    this.bindClick("mail_share", () => {
      const subject = "dアニメストアで一緒にアニメを観ませんか？";
      const text =
        `dアニメストアで『${this.shareTitle()}』を一緒に見ませんか？ 拡張機能『d-party』を使ってパーティーに参加してください\n\n`;
      window.open(
        "mailto:?&subject=" +
          encodeURIComponent(subject) +
          "&body=" +
          encodeURIComponent(text) +
          encodeURIComponent(this.roomUrl + "\n"),
        "",
      );
    });
  }

  /** Register the fullscreen listener that hides the sidebar / repositions toasts. */
  registerFullscreenListener(): void {
    document.addEventListener("fullscreenchange", () => {
      const toast = document.getElementById("awn-toast-container");
      if (document.fullscreenElement) {
        this.hideSidebar();
        toast?.setAttribute("style", "right:24px;");
      } else {
        this.showSidebar();
        toast?.setAttribute("style", "");
      }
    });
  }

  // -- internals -------------------------------------------------------------

  private addUserItem(userId: string, userName: string): void {
    const existing = document.querySelector("#users-" + userId + " p");
    if (existing) {
      (existing as HTMLElement).innerText = userName;
    } else {
      $(".users_wrapper").append(
        `<div class='users_item users_content' id='users-${userId}'><i class='fas fa-user'></i><p class='sidebar_users_text users_content'>${userName}</p></div>`,
      );
    }
  }

  private removeUserItem(elementId: string): void {
    document.getElementById(elementId)?.remove();
  }

  private scrollHistoryToBottom(): void {
    const content = document.getElementsByClassName("sidebar_content")[0];
    if (content) content.scrollTop = content.scrollHeight;
  }

  private shareTitle(): string {
    const text = (cls: string) =>
      document.getElementsByClassName(cls)[0]?.textContent ?? "";
    return `${text("backInfoTxt1")} - ${text("backInfoTxt2")} - ${text("backInfoTxt3")}`;
  }

  private bindClick(className: string, handler: () => void): void {
    const el = document.getElementsByClassName(className)[0] as HTMLElement | undefined;
    if (el) el.onclick = handler;
  }
}
