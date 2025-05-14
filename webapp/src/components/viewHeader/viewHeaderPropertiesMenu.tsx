// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Constants} from '../../constants'
import {IPropertyTemplate} from '../../blocks/board'
import {BoardView} from '../../blocks/boardView'
import mutator from '../../mutator'
import Button from '../../widgets/buttons/button'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'

type Props = {
    properties: readonly IPropertyTemplate[]
    activeView: BoardView
}
const ViewHeaderPropertiesMenu = (props: Props) => {
    const {properties, activeView} = props
    const intl = useIntl()
    const {viewType, visiblePropertyIds} = activeView.fields
    const canShowBadges = viewType === 'board' || viewType === 'gallery' || viewType === 'calendar'

    const toggleVisibility = (propertyId: string) => {
        let newVisiblePropertyIds: string[] = []
        if (visiblePropertyIds.includes(propertyId)) {
            newVisiblePropertyIds = visiblePropertyIds.filter((o: string) => o !== propertyId)
        } else {
            newVisiblePropertyIds = [...visiblePropertyIds, propertyId]
        }
        mutator.changeViewVisibleProperties(activeView.boardId, activeView.id, visiblePropertyIds, newVisiblePropertyIds)
    }

    const toggleAllProperties = (showAll: boolean) => {
        let newVisiblePropertyIds: string[] = []
        if (showAll) {
            // Tüm özellikleri görünür yap
            newVisiblePropertyIds = [...properties.map((o) => o.id)]
            if (activeView.fields.viewType === 'gallery') {
                newVisiblePropertyIds.push(Constants.titleColumnId)
            }
            if (canShowBadges) {
                newVisiblePropertyIds.push(Constants.badgesColumnId)
            }
        } else {
            // Tüm özellikleri gizle
            newVisiblePropertyIds = []
        }
        mutator.changeViewVisibleProperties(activeView.boardId, activeView.id, visiblePropertyIds, newVisiblePropertyIds)
    }

    // Tüm özelliklerin görünür olup olmadığını kontrol et
    const allPropertiesVisible = () => {
        const allPossibleProperties = [...properties.map((o) => o.id)]
        if (activeView.fields.viewType === 'gallery') {
            allPossibleProperties.push(Constants.titleColumnId)
        }
        if (canShowBadges) {
            allPossibleProperties.push(Constants.badgesColumnId)
        }
        
        return allPossibleProperties.every((id) => visiblePropertyIds.includes(id))
    }

    return (
        <MenuWrapper label={intl.formatMessage({id: 'ViewHeader.properties-menu', defaultMessage: 'Properties menu'})}>
            <Button>
                <FormattedMessage
                    id='ViewHeader.properties'
                    defaultMessage='Properties'
                />
            </Button>
            <Menu>
                <Menu.Switch
                    key='toggle-all'
                    id='toggle-all'
                    name={intl.formatMessage({id: 'ViewHeader.properties-toggle-all', defaultMessage: 'Tümünü aç/kapat'})}
                    isOn={allPropertiesVisible()}
                    suppressItemClicked={true}
                    onClick={() => toggleAllProperties(!allPropertiesVisible())}
                />
                <Menu.Separator/>
                {activeView.fields.viewType === 'gallery' &&
                    <Menu.Switch
                        key={Constants.titleColumnId}
                        id={Constants.titleColumnId}
                        name={intl.formatMessage({id: 'default-properties.title', defaultMessage: 'Title'})}
                        isOn={visiblePropertyIds.includes(Constants.titleColumnId)}
                        suppressItemClicked={true}
                        onClick={toggleVisibility}
                    />}
                {properties?.map((option: IPropertyTemplate) => (
                    <Menu.Switch
                        key={option.id}
                        id={option.id}
                        name={option.name}
                        isOn={visiblePropertyIds.includes(option.id)}
                        suppressItemClicked={true}
                        onClick={toggleVisibility}
                    />
                ))}
                {canShowBadges &&
                    <Menu.Switch
                        key={Constants.badgesColumnId}
                        id={Constants.badgesColumnId}
                        name={intl.formatMessage({id: 'default-properties.badges', defaultMessage: 'Comments and description'})}
                        isOn={visiblePropertyIds.includes(Constants.badgesColumnId)}
                        suppressItemClicked={true}
                        onClick={toggleVisibility}
                    />}
            </Menu>
        </MenuWrapper>
    )
}

export default React.memo(ViewHeaderPropertiesMenu)
