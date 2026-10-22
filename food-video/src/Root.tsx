import { BallotComposition } from "./BallotVideo";
import { BallotV2Composition } from "./BallotV2";
import { MyComposition } from "./Composition";
import { IranComposition } from "./IranVideo";
import { PaperComposition } from "./PaperBallot";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <IranComposition />
      <BallotComposition />
      <BallotV2Composition />
      <PaperComposition />
    </>
  );
};
