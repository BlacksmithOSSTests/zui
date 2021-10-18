import get from "lodash/get"
import React from "react"
import {useSelector} from "react-redux"
import Current from "../../state/Current"
import WorkspaceStatuses from "../../state/WorkspaceStatuses"
import AddPoolButton from "../AddPoolButton"
import SavedPoolsList from "../SavedPoolsList"
import {
  ClickRegion,
  DragAnchor,
  SectionContents,
  SectionHeader,
  StyledArrow,
  StyledSection,
  Title
} from "./common"

function PoolsSection({isOpen, style, resizeProps, toggleProps}) {
  const workspace = useSelector(Current.getWorkspace)
  const id = get(workspace, ["id"], "")
  const wsStatus = useSelector(WorkspaceStatuses.get(id))
  const pools = useSelector(Current.getPools)

  return (
    <StyledSection style={style}>
      <DragAnchor {...resizeProps} />
      <SectionHeader>
        <ClickRegion {...toggleProps}>
          <StyledArrow show={isOpen} />
          <Title>Pools</Title>
        </ClickRegion>
        <AddPoolButton />
      </SectionHeader>
      <SectionContents>
        <SavedPoolsList pools={pools} workspaceStatus={wsStatus} />
      </SectionContents>
    </StyledSection>
  )
}

export default PoolsSection
