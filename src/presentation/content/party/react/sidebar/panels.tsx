import { LogOut, PartyPopper, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { SidebarState } from "../sidebarStore";

export function CreatePanel({
  onCreateRoom,
}: {
  onCreateRoom: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <PartyPopper className="size-8 text-red-600" aria-hidden />
      <div>
        <p className="text-sm font-semibold">パーティールームを作成</p>
        <p className="mt-1 text-xs text-muted-foreground">
          パーティーを主催して、みんなで同時に鑑賞しよう！
        </p>
      </div>
      <Button onClick={onCreateRoom} className="w-full">
        ルームを作成
      </Button>
    </div>
  );
}

export function UsersPanel({ state }: { state: SidebarState }): React.JSX.Element {
  if (state.users.length === 0) {
    return <EmptyHint text="参加者はいません" />;
  }
  return (
    <div className="px-1">
      <p className="mb-2 text-xs text-muted-foreground">{state.users.length}人が参加中</p>
      <ul className="flex flex-col gap-1">
        {state.users.map((user) => {
          const isSelf = user.user_id === state.selfUserId;
          return (
            <li
              key={user.user_id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
            >
              <UserRound className="size-4 shrink-0 text-red-600" aria-hidden />
              <span className="truncate">{user.user_name}</span>
              {isSelf && (
                <span className="ml-auto shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-white">
                  you
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ControlPanel({
  onLeave,
}: {
  onLeave: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 px-1">
      <div>
        <p className="text-sm font-semibold">パーティールームから退室</p>
        <p className="mt-1 text-xs text-muted-foreground">
          退室するとサイドバーが閉じます。
        </p>
      </div>
      <Button variant="destructive" className="w-full gap-1.5" onClick={onLeave}>
        <LogOut className="size-4" aria-hidden /> 退室する
      </Button>
    </div>
  );
}

export function EmptyHint({ text }: { text: string }): React.JSX.Element {
  return (
    <p className="px-2 py-6 text-center text-xs text-muted-foreground">{text}</p>
  );
}
