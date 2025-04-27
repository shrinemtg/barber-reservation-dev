import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function ReservationComplete() {
  return (
    <Card className="max-w-md mx-auto p-0 mt-8 shadow-xl rounded-2xl overflow-hidden">
      <div className="p-8 flex flex-col items-center">
        <CheckCircle2 className="text-green-500 w-12 h-12 mb-2" />
        <h2 className="text-2xl font-bold mb-2">予約が完了しました</h2>
        <p className="mb-6 text-gray-700 text-center">
          ご予約ありがとうございます。
          <br />
          ご来店を心よりお待ちしております。
        </p>
        <div className="flex gap-4 w-full">
          <Link href="/">
            <Button className="w-full" variant="outline">
              トップへ戻る
            </Button>
          </Link>
          <Link href="/reservation-list">
            <Button className="w-full" variant="default">
              予約一覧を見る
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
